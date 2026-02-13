from setuptools import setup, find_packages

setup(
    name="session-hook-agent",
    version="1.0.0",
    description="Python HTTP client for Claude session storage integration",
    author="Claude",
    packages=find_packages(),
    py_modules=["hook_agent"],
    install_requires=[
        "httpx>=0.27.0",
    ],
    python_requires=">=3.11",
)
