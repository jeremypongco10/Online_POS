# POS System

Point-of-sale system with a CodeIgniter 4 (PHP) backend and a React + TypeScript frontend.

## Structure

```
pos-system/
├── backend/    CodeIgniter 4 API
├── frontend/   React + TypeScript app (Vite)
├── database/   Migrations, seeds, schema references
├── docs/       Project documentation
└── tests/      Cross-stack / integration tests
```

## Prerequisites

- PHP 8.1+ with `openssl`, `mbstring`, `curl`, `intl`, `mysqli`, `pdo_mysql` extensions
- Composer
- Node.js + npm
- MySQL 8.x
- Git

## Backend setup

```
cd backend
composer install
cp .env.example .env   # then fill in real values, never commit .env
php spark serve
```

## Frontend setup

```
cd frontend
npm install
npm run dev
```

## Database

A local MySQL database `pos_system` and user `pos_user` are expected. See
`backend/.env.example` for the connection settings the backend reads, and
`database/` for migrations and seed data.
