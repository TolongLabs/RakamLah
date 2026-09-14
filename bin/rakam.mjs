#!/usr/bin/env node

import { runEntrypoint } from '../src/entrypoint.mjs'

process.exitCode = await runEntrypoint(process.argv.slice(2))
