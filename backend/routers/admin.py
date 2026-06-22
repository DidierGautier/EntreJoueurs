from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Bet, BetEntry, Transaction, BetStatus, TransactionType
from schemas import BetOut, ResolvePayload
from auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

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

    bet.status = BetStatus.resolved
    bet.result = payload.result

    pot = float(bet.stake) * 2

    for entry in bet.entries:
        user = await db.get(User, entry.user_id)
        if entry.side == payload.result:
            user.balance = float(user.balance) + pot
            tx = Transaction(
                user_id=user.id,
                bet_id=bet.id,
                amount=pot,
                type=TransactionType.bet_won,
                label=f"Gain — {bet.title}",
            )
        else:
            tx = Transaction(
                user_id=user.id,
                bet_id=bet.id,
                amount=-float(bet.stake),
                type=TransactionType.bet_lost,
                label=f"Perte — {bet.title}",
            )
        db.add(tx)

    await db.commit()
    return {"detail": "Pari résolu", "winner_side": payload.result}
