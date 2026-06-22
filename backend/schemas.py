from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from models import BetStatus, BetResult, TransactionType

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: str
    email: str
    is_admin: bool
    balance: float
    created_at: datetime
    model_config = {"from_attributes": True}

class BetCreate(BaseModel):
    title: str
    description: str = ""
    category: str = ""
    side_a_label: str = "Pour"
    side_b_label: str = "Contre"
    stake: float
    deadline: datetime
    creator_side: str  # "a" or "b"

class EntryOut(BaseModel):
    id: str
    user_id: str
    side: str
    created_at: datetime
    model_config = {"from_attributes": True}

class BetOut(BaseModel):
    id: str
    creator_id: str
    title: str
    description: str
    category: str
    side_a_label: str
    side_b_label: str
    stake: float
    deadline: datetime
    status: BetStatus
    result: Optional[BetResult]
    creator_side: str
    created_at: datetime
    entries: list[EntryOut] = []
    model_config = {"from_attributes": True}

class TransactionOut(BaseModel):
    id: str
    bet_id: Optional[str]
    amount: float
    type: TransactionType
    label: str
    created_at: datetime
    model_config = {"from_attributes": True}

class ResolvePayload(BaseModel):
    result: BetResult
