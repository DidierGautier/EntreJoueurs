import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from openai import AsyncOpenAI

from database import get_db
from models import User, Bet, BetEntry, Transaction, BetStatus, TransactionType
from schemas import BetOut, ResolvePayload
from auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

def _get_ai_client():
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="Clé OPENAI_API_KEY non configurée dans le .env")
    return AsyncOpenAI(api_key=key)

@router.get("/bets", response_model=list[BetOut])
async def list_all_bets(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Bet)
        .options(selectinload(Bet.entries))
        .where(Bet.status == BetStatus.matched)
        .order_by(Bet.created_at.desc())
    )
    return result.scalars().all()

@router.patch("/bets/{bet_id}/resolve")
async def resolve_bet(
    bet_id: str,
    payload: ResolvePayload,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Bet).options(selectinload(Bet.entries)).where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Pari introuvable")
    if bet.status != BetStatus.matched:
        raise HTTPException(status_code=400, detail="Seuls les paris matchés peuvent être résolus")

    await _apply_resolution(bet, payload.result, db)
    return {"detail": "Pari résolu", "winner_side": payload.result}

@router.post("/bets/{bet_id}/ai-resolve")
async def ai_resolve_bet(
    bet_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Bet).options(selectinload(Bet.entries)).where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Pari introuvable")
    if bet.status != BetStatus.matched:
        raise HTTPException(status_code=400, detail="Seuls les paris matchés peuvent être résolus")

    prompt = f"""Tu es un arbitre impartial chargé de déterminer le résultat d'un pari.

Pari : {bet.title}
Description : {bet.description or "(aucune description)"}
Côté A — "{bet.side_a_label}"
Côté B — "{bet.side_b_label}"
Deadline : {bet.deadline.strftime("%d/%m/%Y %H:%M")} UTC

En te basant sur tes connaissances des événements réels, détermine quel côté a gagné.
Réponds UNIQUEMENT avec la lettre "a" ou la lettre "b", sans rien d'autre.
Si tu ne peux pas déterminer le résultat avec certitude, réponds "unknown"."""

    response = await _get_ai_client().chat.completions.create(
        model="gpt-4o",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}],
    )

    verdict = response.choices[0].message.content.strip().lower()

    if verdict not in ("a", "b"):
        raise HTTPException(
            status_code=422,
            detail=f"ChatGPT n'a pas pu déterminer le résultat de ce pari (réponse : {verdict}). Résolvez manuellement.",
        )

    await _apply_resolution(bet, verdict, db)
    label = bet.side_a_label if verdict == "a" else bet.side_b_label
    return {"detail": f"Résolu par IA — gagnant : {label}", "winner_side": verdict}

async def _apply_resolution(bet: Bet, winner: str, db: AsyncSession):
    bet.status = BetStatus.resolved
    bet.result = winner
    pot = float(bet.stake) * 2

    for entry in bet.entries:
        user = await db.get(User, entry.user_id)
        if entry.side == winner:
            user.balance = float(user.balance) + pot
            tx = Transaction(
                user_id=user.id, bet_id=bet.id, amount=pot,
                type=TransactionType.bet_won, label=f"Gain — {bet.title}",
            )
        else:
            tx = Transaction(
                user_id=user.id, bet_id=bet.id, amount=-float(bet.stake),
                type=TransactionType.bet_lost, label=f"Perte — {bet.title}",
            )
        db.add(tx)

    await db.commit()
