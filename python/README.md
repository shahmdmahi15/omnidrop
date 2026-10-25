# pyomnidrop

Official Python package for **OmniDrop** — Ultra-High-Throughput Multi-Path P2P Content-Defined Mesh File Fabric.

## Quickstart

```python
import pyomnidrop

# Verify version
print(pyomnidrop.__version__)

# Send a file or directory over local mesh
client = pyomnidrop.OmniDropClient()
client.send(path="./large_dataset.tar.gz", target="auto-discover")
```

Author: Shah Md. Mahi (shahmdmahi15@gmail.com)  
Website: https://omnidrop.shahmdmahi.dpdns.org
