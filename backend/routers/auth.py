from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Transaction, TransactionType
from schemas import UserRegister, UserLogin, Token, UserOut
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=Token)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    await db.flush()
    # Bonus de bienvenue
    tx = Transaction(
        user_id=user.id,
        amount=1000.0,
        type=TransactionType.bonus,
        label="Bonus de bienvenue",
    )
    db.add(tx)
    await db.commit()
    await db.refresh(user)
    return Token(access_token=create_token(user.id))

@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    return Token(access_token=create_token(user.id))

@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
