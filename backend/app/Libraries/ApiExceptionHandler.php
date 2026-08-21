<?php

namespace App\Libraries;

use CodeIgniter\Debug\BaseExceptionHandler;
use CodeIgniter\Debug\ExceptionHandlerInterface;
use CodeIgniter\Exceptions\PageNotFoundException;
use CodeIgniter\HTTP\Exceptions\HTTPException;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

/**
 * Renders every uncaught exception under /api/* as the same JSON
 * envelope the rest of the API uses, and logs it centrally.
 */
class ApiExceptionHandler extends BaseExceptionHandler implements ExceptionHandlerInterface
{
    public function handle(
        Throwable $exception,
        RequestInterface $request,
        ResponseInterface $response,
        int $statusCode,
        int $exitCode
    ): void {
        if ($this->config->log && ! in_array($statusCode, $this->config->ignoreCodes, true)) {
            log_message('critical', "[API] {message} in {file}:{line}", [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);
        }

        $message = $this->publicMessage($exception, $statusCode);

        $body = [
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => null,
            'meta' => null,
        ];

        if (ENVIRONMENT === 'development') {
            $body['errors'] = [
                'exception' => $exception::class,
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ];
        }

        $response->setStatusCode($statusCode)->setJSON($body)->send();

        if (ENVIRONMENT !== 'testing') {
            exit($exitCode);
        }
    }

    private function publicMessage(Throwable $exception, int $statusCode): string
    {
        if ($exception instanceof PageNotFoundException) {
            return 'The requested resource was not found.';
        }

        if ($exception instanceof HTTPException) {
            return $exception->getMessage();
        }

        // Don't leak internal error detail for unexpected 500s in production.
        if ($statusCode >= 500 && ENVIRONMENT !== 'development') {
            return 'An unexpected error occurred. Please try again later.';
        }

        return $exception->getMessage();
    }
}
