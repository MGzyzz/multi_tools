from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    recipient: int | str = Field(..., description="Telegram chat id or username")
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    urgent: bool = False
    thread_id: int | None = None


class SendThreadMessageRequest(BaseModel):
    group_id: int = Field(..., description="Telegram group chat id")
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    thread_id: int | None = None
    urgent: bool = False


class MessageResponse(BaseModel):
    status: str
    message_id: str | None = None


class BotStatusResponse(BaseModel):
    status: str
