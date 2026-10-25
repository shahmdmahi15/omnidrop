"""
pyomnidrop: Official Python client and CLI interface for OmniDrop.
Author: Shah Md. Mahi <shahmdmahi15@gmail.com>
Website: https://omnidrop.shahmdmahi.dpdns.org
"""

import subprocess
import shutil
import sys
from typing import Optional, List

__version__ = "0.1.0"
__author__ = "Shah Md. Mahi"


class OmniDropClient:
    """Client wrapper for interacting with the native OmniDrop high-speed mesh engine."""

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path or shutil.which("omnidrop")

    def send(self, path: str, target: str = "auto", extra_args: Optional[List[str]] = None) -> int:
        """Send a file or directory over local mesh."""
        cmd = [self.binary_path or "omnidrop", "send", path, "--target", target]
        if extra_args:
            cmd.extend(extra_args)
        return subprocess.call(cmd)

    def receive(self, output_dir: str = "./downloads", port: int = 4820) -> int:
        """Listen for incoming peer streams and assemble files."""
        cmd = [self.binary_path or "omnidrop", "receive", "--output", output_dir, "--port", str(port)]
        return subprocess.call(cmd)

    def bench(self, size_mb: int = 128) -> int:
        """Run microbenchmarks measuring FastCDC chunking and BLAKE3 hashing speed."""
        cmd = [self.binary_path or "omnidrop", "bench", "--size", str(size_mb)]
        return subprocess.call(cmd)
