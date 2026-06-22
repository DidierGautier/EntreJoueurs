from sqlalchemy import String, Boolean, ForeignKey, DateTime, Numeric, Integer, Enum, Text, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import uuid
import enum

class BetStatus(str, enum.Enum):
    open = "open"
    matched = "matched"
    resolved = "resolved"
    cancelled = "cancelled"

class BetResult(str, enum.Enum):
    a = "a"
    b = "b"

class TransactionType(str, enum.Enum):
    bonus = "bonus"
    bet_frozen = "bet_frozen"
    bet_won = "bet_won"
    bet_lost = "bet_lost"
    bet_refunded = "bet_refunded"

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=1000.0)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    bets_created: Mapped[list["Bet"]] = relationship(back_populates="creator")
    entries: Mapped[list["BetEntry"]] = relationship(back_populates="user")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")

class Bet(Base):
    __tablename__ = "bets"
    __table_args__ = (
        Index("ix_bets_status_deadline", "status", "deadline"),
        Index("ix_bets_creator", "creator_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="")
    side_a_label: Mapped[str] = mapped_column(String, default="Pour")
    side_b_label: Mapped[str] = mapped_column(String, default="Contre")
    stake: Mapped[float] = mapped_column(Numeric(12, 2))
    deadline: Mapped[DateTime] = mapped_column(DateTime)
    status: Mapped[BetStatus] = mapped_column(Enum(BetStatus), default=BetStatus.open)
    result: Mapped[str] = mapped_column(Enum(BetResult), nullable=True)
    creator_side: Mapped[str] = mapped_column(String)  # "a" or "b"
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    creator: Mapped["User"] = relationship(back_populates="bets_created")
    entries: Mapped[list["BetEntry"]] = relationship(back_populates="bet")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="bet")

class BetEntry(Base):
    __tablename__ = "bet_entries"
    __table_args__ = (
        Index("ix_bet_entries_bet", "bet_id"),
        Index("ix_bet_entries_user", "user_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    bet_id: Mapped[str] = mapped_column(ForeignKey("bets.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    side: Mapped[str] = mapped_column(String)  # "a" or "b"
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    bet: Mapped["Bet"] = relationship(back_populates="entries")
    user: Mapped["User"] = relationship(back_populates="entries")

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user", "user_id"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    bet_id: Mapped[str] = mapped_column(ForeignKey("bets.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    label: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="transactions")
    bet: Mapped["Bet"] = relationship(back_populates="transactions")
