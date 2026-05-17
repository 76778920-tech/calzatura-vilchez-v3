"""CI: requirements.lock y docker_install_locked_deps.sh deben coincidir."""
from scripts.verify_docker_install_sync import main


def test_docker_install_script_matches_lock() -> None:
    assert main() == 0
