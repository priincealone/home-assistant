"""PS5 coordinator — polls DDP status on a fixed interval."""

from datetime import timedelta
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import POLL_INTERVAL
from .ddp import DDPStatus, async_get_status

_LOGGER = logging.getLogger(__name__)


class PS5Coordinator(DataUpdateCoordinator[DDPStatus]):
    """Polls DDP every POLL_INTERVAL seconds."""

    config_entry: ConfigEntry

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=f"PS5 {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=POLL_INTERVAL),
        )
        self._host = entry.data[CONF_HOST]

    async def _async_update_data(self) -> DDPStatus:
        try:
            return await async_get_status(self._host)
        except Exception as exc:
            raise UpdateFailed(f"DDP error: {exc}") from exc
