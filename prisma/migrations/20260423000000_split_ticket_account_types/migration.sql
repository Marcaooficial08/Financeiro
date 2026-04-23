-- Renomeia o valor genérico TICKET para TICKET_MEAL (preserva dados existentes)
ALTER TYPE "AccountType" RENAME VALUE 'TICKET' TO 'TICKET_MEAL';

-- Adiciona o novo valor TICKET_FUEL
ALTER TYPE "AccountType" ADD VALUE 'TICKET_FUEL' BEFORE 'OTHER';
