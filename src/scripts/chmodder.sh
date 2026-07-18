#!/bin/bash

find ./local -type f -name "*.sh" -exec chmod +x {} \;
find ./ubuntu -type f -name "*.sh" -exec chmod +x {} \;
