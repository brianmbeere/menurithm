"""Croprithm integration settings, with legacy environment compatibility."""

import os

DEFAULT_CROPRITHM_URL = "https://api.croprithm.com/api"


def get_croprithm_api_key() -> str | None:
    if "CROPRITHM_API_KEY" in os.environ:
        return os.environ["CROPRITHM_API_KEY"]
    return os.getenv("ROUTECAST_API_KEY")


def get_croprithm_base_url() -> str:
    if "CROPRITHM_BASE_URL" in os.environ:
        value = os.environ["CROPRITHM_BASE_URL"]
    else:
        value = os.getenv("ROUTECAST_BASE_URL", DEFAULT_CROPRITHM_URL)
    if not value.strip():
        raise ValueError("CROPRITHM_BASE_URL must not be empty")
    return value.rstrip("/")
