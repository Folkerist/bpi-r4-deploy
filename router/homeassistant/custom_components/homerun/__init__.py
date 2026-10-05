"""homerunPET (霍曼宠物) litter boxes via the homerun cloud."""

from __future__ import annotations

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import HomerunAuthError, HomerunClient, HomerunError
from .api.const import BASE_URLS
from .const import CONF_CLIENT_DEVICE_ID, CONF_REGION, CONF_TOKEN, DEFAULT_REGION
from .coordinator import HomerunConfigEntry, HomerunCoordinator

PLATFORMS = [
    Platform.BINARY_SENSOR,
    Platform.BUTTON,
    Platform.EVENT,
    Platform.NUMBER,
    Platform.SENSOR,
    Platform.SWITCH,
]


def make_client(hass: HomeAssistant, data: dict) -> HomerunClient:
    return HomerunClient(
        async_get_clientsession(hass),
        data[CONF_TOKEN],
        base_url=BASE_URLS[data.get(CONF_REGION, DEFAULT_REGION)],
        time_zone=str(hass.config.time_zone),
        client_device_id=data.get(CONF_CLIENT_DEVICE_ID),
    )


async def async_setup_entry(hass: HomeAssistant, entry: HomerunConfigEntry) -> bool:
    client = make_client(hass, dict(entry.data))
    try:
        devices = await client.litter_boxes()
    except HomerunAuthError as err:
        raise ConfigEntryAuthFailed("The homerun token is no longer valid") from err
    except HomerunError as err:
        raise ConfigEntryNotReady(str(err)) from err

    coordinator = HomerunCoordinator(hass, entry, client, devices)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: HomerunConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
