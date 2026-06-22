from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Bet, BetEntry, Transaction, BetStatus, TransactionType
from schemas import BetCreate, BetOut, ResolvePayload
from auth import get_current_user, optional_user

router = APIRouter(prefix="/api/bets", tags=["bets"])

@router.get("/", response_model=list[BetOut])
async def list_bets(
    status: str = "open",
    db: AsyncSession = Depends(get_db),
    _: User | None = Depends(optional_user),
):
    result = await db.execute(
        select(Bet)
        .options(selectinload(Bet.entries))
        .where(Bet.status == status)
        .order_by(Bet.created_at.desc())
    )
    return result.scalars().all()

@router.get("/mine", response_model=list[BetOut])
async def my_bets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Bet)
        .options(selectinload(Bet.entries))
        .where(Bet.creator_id == user.id)
        .order_by(Bet.created_at.desc())
    )
    created = result.scalars().all()

    result2 = await db.execute(
        select(Bet)
        .options(selectinload(Bet.entries))
        .join(BetEntry, BetEntry.bet_id == Bet.id)
        .where(BetEntry.user_id == user.id, Bet.creator_id != user.id)
        .order_by(Bet.created_at.desc())
    )
    accepted = result2.scalars().all()

    seen = {b.id for b in created}
    return list(created) + [b for b in accepted if b.id not in seen]

@router.get("/{bet_id}", response_model=BetOut)
async def get_bet(bet_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Bet).options(selectinload(Bet.entries)).where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Pari introuvable")
    return bet

@router.post("/", response_model=BetOut)
async def create_bet(
    data: BetCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.stake <= 0:
        raise HTTPException(status_code=400, detail="La mise doit être positive")
    if data.stake > float(user.balance):
        raise HTTPException(status_code=400, detail="Solde insuffisant")
    if data.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="La deadline doit être dans le futur")
    if data.creator_side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="Côté invalide (a ou b)")

    user.balance = float(user.balance) - data.stake

    bet = Bet(
        creator_id=user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        side_a_label=data.side_a_label,
        side_b_label=data.side_b_label,
        stake=data.stake,
        deadline=data.deadline,
        creator_side=data.creator_side,
    )
    db.add(bet)
    await db.flush()

    entry = BetEntry(bet_id=bet.id, user_id=user.id, side=data.creator_side)
    db.add(entry)

    tx = Transaction(
        user_id=user.id,
        bet_id=bet.id,
        amount=-data.stake,
        type=TransactionType.bet_frozen,
        label=f"Mise gelée — {data.title}",
    )
    db.add(tx)

    await db.commit()
    await db.refresh(bet)

    result = await db.execute(
        select(Bet).options(selectinload(Bet.entries)).where(Bet.id == bet.id)
    )
    return result.scalar_one()

@router.post("/{bet_id}/accept", response_model=BetOut)
async def accept_bet(
    bet_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Bet).options(selectinload(Bet.entries)).where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Pari introuvable")
    if bet.status != BetStatus.open:
        raise HTTPException(status_code=400, detail="Ce pari n'est plus disponible")
    if bet.creator_id == user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas répondre à votre propre pari")
    if datetime.utcnow() > bet.deadline:
        raise HTTPException(status_code=400, detail="Ce pari a expiré")
    if float(user.balance) < float(bet.stake):
        raise HTTPException(status_code=400, detail="Solde insuffisant")

    opponent_side = "b" if bet.creator_side == "a" else "a"

    user.balance = float(user.balance) - float(bet.stake)
    bet.status = BetStatus.matched

    entry = BetEntry(bet_id=bet.id, user_id=user.id, side=opponent_side)
    db.add(entry)

    tx = Transaction(
        user_id=user.id,
        bet_id=bet.id,
        amount=-float(bet.stake),
        type=TransactionType.bet_frozen,
        label=f"Mise gelée — {bet.title}",
    )
    db.add(tx)

    await db.commit()

    result = await db.execute(
        select(Bet).options(selectinload(Bet.entries)).where(Bet.id == bet_id)
    )
    return result.scalar_one()

@router.delete("/{bet_id}")
async def cancel_bet(
    bet_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bet = await db.get(Bet, bet_id)
    if not bet:
        raise HTTPException(status_code=404, detail="Pari introuvable")
    if bet.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    if bet.status != BetStatus.open:
        raise HTTPException(status_code=400, detail="Seuls les paris ouverts peuvent être annulés")

    bet.status = BetStatus.cancelled
    user.balance = float(user.balance) + float(bet.stake)

    tx = Transaction(
        user_id=user.id,
        bet_id=bet.id,
        amount=float(bet.stake),
        type=TransactionType.bet_refunded,
        label=f"Remboursement — {bet.title}",
    )
    db.add(tx)
    await db.commit()
    return {"detail": "Pari annulé"}
