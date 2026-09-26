"""PlayStation 5 integration — local DDP control."""

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .coordinator import PS5Coordinator

PLATFORMS = [Platform.MEDIA_PLAYER]

type PS5ConfigEntry = ConfigEntry[PS5Coordinator]


def _preload_remoteplay() -> None:
    """Importa o pyremoteplay fora do event loop (o import faz E/S de disco)."""
    try:
        import pyremoteplay.ddp  # noqa: F401
        import pyremoteplay.session  # noqa: F401
    except ImportError:
        pass  # sem a biblioteca só o repouso falha; leitura e WAKEUP seguem


async def async_setup_entry(hass: HomeAssistant, entry: PS5ConfigEntry) -> bool:
    await hass.async_add_executor_job(_preload_remoteplay)
    coordinator = PS5Coordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: PS5ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
