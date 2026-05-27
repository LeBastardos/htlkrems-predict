from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio


router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def send_personal_json(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        await websocket.send_json(message)

    async def broadcast_json(self, message: Dict[str, Any]) -> None:
        """Broadcast a JSON-serializable dict to all connected clients.

        This method is safe to call from other coroutines; it will attempt to
        send to each client and remove connections that raise disconnects.
        """
        # copy list to avoid mutation while iterating
        async with self._lock:
            conns = list(self.active_connections)

        to_remove: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except WebSocketDisconnect:
                to_remove.append(ws)
            except Exception:
                # best-effort: mark for removal on other errors
                to_remove.append(ws)

        if to_remove:
            async with self._lock:
                for ws in to_remove:
                    if ws in self.active_connections:
                        self.active_connections.remove(ws)


# single shared manager instance that other modules can import
manager = ConnectionManager()


@router.websocket("/ws/updates")
async def websocket_updates_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates.

    Clients should connect to `/api/v1/ws/updates` (or `/ws/updates` if served
    without an API prefix). The server will broadcast dicts via
    `manager.broadcast_json(...)` when events happen.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive and optionally receive pings/commands
            data = await websocket.receive_text()
            # We currently do not process client messages, but echoing a simple
            # ack keeps things friendly for debugging.
            await websocket.send_json({"type": "ack", "received": data})
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


async def notify_market_update(market_id: int, new_odds: Dict[str, float]) -> None:
    """Convenience helper to broadcast market updates.

    Message format is:
      {"type": "market.update", "market_id": int, "odds": {"yes": float, "no": float}}
    """
    payload = {"type": "market.update", "market_id": market_id, "odds": new_odds}
    await manager.broadcast_json(payload)
