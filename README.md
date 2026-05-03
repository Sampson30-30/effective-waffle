# effective-waffle

Inspired by Asana, but built for a different purpose.

Most project tools help you manage work. This one helps you understand it. The core idea is that good solutions rarely appear from nowhere — they surface from patterns across different projects, half-finished ideas, and problems you've already solved somewhere else. This tool exists to make those connections visible.

## Philosophy

This app takes DRY (Don't Repeat Yourself) as a philosophical stance, not just a coding principle. Before starting something new, the question worth asking is: *have I solved a version of this before?* Tags, root problems, and insights are the mechanism for answering that. A task in one project might be the seed of a solution in another. An insight logged today might be exactly what unblocks something six months from now.

## What it does

- **Root Problems** — the recurring themes or challenges that show up across your work. Projects live under these, so you can see which problems keep generating effort.
- **Projects & Tasks** — standard project/task management, but connected upward to root problems and outward via tags.
- **Tags** — a cross-cutting index. Tag a task or project and you can find everywhere that idea, tool, or pattern has appeared.
- **Insights** — a place to log realisations, decisions, or patterns worth remembering. Linked to projects so context is never lost.
- **Calendar** — syncs with iCloud Calendar via CalDAV so scheduled work sits alongside everything else.

## Stack

- **Frontend** — React, Tailwind CSS
- **Backend** — Node.js, Express
- **Database** — PostgreSQL
- **Infrastructure** — Docker Compose

## Getting started

1. Clone the repo
2. Copy `backend/.env.example` to `backend/.env` and fill in your values
3. Run `docker compose up`
4. Open [http://localhost:3000](http://localhost:3000)

For iCloud Calendar sync, `CALDAV_PASS` should be an app-specific password generated at [appleid.apple.com](https://appleid.apple.com), not your regular Apple ID password.
