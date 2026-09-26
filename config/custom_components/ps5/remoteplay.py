"""Standby do PS5 por sessão Remote Play (o DDP não tem comando de repouso).

Usa a biblioteca ``pyremoteplay``. Ela é importada só na hora do uso, então um defeito
nela nunca impede a integração de carregar (leitura de estado e WAKEUP continuam).

Atenção: abrir sessão Remote Play em console em repouso o ACORDA. Este módulo recusa
agir se o console não estiver ligado.
"""

import asyncio
import logging

_LOGGER = logging.getLogger(__name__)

SESSION_TIMEOUT = 15.0  # segundos para a sessão ficar pronta
STANDBY_WAIT = 5.0  # segundos esperando o console encerrar a sessão após o standby


class StandbyError(Exception):
    """Não foi possível pôr o console em repouso."""


async def async_standby(host: str, regist_key: str, rp_key: str) -> None:
    """Abre uma sessão Remote Play, manda o console para repouso e fecha a sessão.

    :param host: IP do console.
    :param regist_key: ``PS5-RegistKey`` (hex) gravada no pareamento.
    :param rp_key: ``RP-Key`` (hex) gravada no pareamento.
    :raises StandbyError: console fora de alcance, em repouso, sessão recusada ou ocupada.
    """
    try:
        from pyremoteplay.ddp import async_get_status
        from pyremoteplay.session import Session
    except ImportError as exc:
        raise StandbyError(f"Biblioteca pyremoteplay indisponível: {exc}") from exc

    status = await async_get_status(host)
    if not status:
        raise StandbyError(f"Console em {host} não respondeu")
    if status.get("status-code") != 200:
        # Sessão contra console em repouso o acordaria: não é o que se pediu.
        raise StandbyError("Console não está ligado; nada a fazer")

    profile = {
        "id": "",
        "hosts": {
            status["host-id"]: {
                "type": status["host-type"],
                "data": {"RegistKey": regist_key, "RP-Key": rp_key},
            },
        },
    }
    session = Session(host, profile)
    try:
        # wakeup=False: nunca acordar por aqui. O fluxo precisa iniciar (resolução mínima,
        # ver Session._set_lowest_stream): é ele que marca a sessão como pronta.
        if not await asyncio.wait_for(session.start(wakeup=False), SESSION_TIMEOUT):
            raise StandbyError(session.error or "Sessão Remote Play não iniciou")
        if not await session.async_wait(SESSION_TIMEOUT):
            raise StandbyError(session.error or "Sessão Remote Play não ficou pronta")
        # async_standby da biblioteca tem laço de espera invertido (não espera nada);
        # enviamos e aguardamos nós mesmos o console derrubar a sessão.
        session._send_standby()  # noqa: SLF001
        try:
            await asyncio.wait_for(session.stop_event.wait(), STANDBY_WAIT)
        except TimeoutError:
            _LOGGER.debug("Console não encerrou a sessão em %ss; confirme pelo DDP", STANDBY_WAIT)
    except TimeoutError as exc:
        raise StandbyError("Tempo esgotado abrindo a sessão Remote Play") from exc
    finally:
        session.stop()
