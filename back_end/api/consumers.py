from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from accounts.models import TeacherProfile
from app.utils.realtime_notifications import build_teacher_notifications_group


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    group_name: str | None = None

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        teacher_id = await self._get_teacher_id(user.id)
        if not teacher_id:
            await self.close(code=4403)
            return

        self.group_name = build_teacher_notifications_group(teacher_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_created(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def _get_teacher_id(self, user_id: int) -> int | None:
        return TeacherProfile.objects.filter(user_id=user_id).values_list("id", flat=True).first()
