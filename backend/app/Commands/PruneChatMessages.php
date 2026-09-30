<?php

namespace App\Commands;

use App\Models\ChatMessageModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * Deletes chat_messages older than ChatMessageModel::RETENTION_MONTHS
 * (3 months) — across every company, permanently, no confirmation prompt.
 * Unlike dev:reset-transactions this is safe to run in production and on
 * a schedule; it's exactly the routine cleanup a real deployment would
 * point a cron job at.
 *
 * Not the only way this happens: ChatController::maybePrune() already
 * runs the same ChatMessageModel::pruneOlderThan() opportunistically off
 * ordinary chat traffic (throttled to once an hour), since this app has
 * no cron/scheduler of its own to guarantee any command actually gets
 * invoked. This command exists for anyone who'd rather point a real
 * cron/Task Scheduler entry at deletion directly instead of leaning on
 * that — running both is harmless (whichever runs first empties the
 * window for the other).
 */
class PruneChatMessages extends BaseCommand
{
    protected $group       = 'Chat';
    protected $name        = 'chat:prune';
    protected $description = 'Deletes chat messages older than ' . ChatMessageModel::RETENTION_MONTHS . ' months. Safe to run on a schedule.';

    public function run(array $params)
    {
        $deleted = model(ChatMessageModel::class)->pruneOlderThan();

        CLI::write("Deleted {$deleted} chat message(s) older than " . ChatMessageModel::RETENTION_MONTHS . ' months.', 'green');
    }
}
