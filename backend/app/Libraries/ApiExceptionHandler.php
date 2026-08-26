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

        $message = $this->publicMessage($exception);

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

    private function publicMessage(Throwable $exception): string
    {
        if ($exception instanceof PageNotFoundException) {
            return 'The requested resource was not found.';
        }

        if ($exception instanceof HTTPException) {
            return $exception->getMessage();
        }

        // Anything else escaped every controller's own try/catch, so its
        // message was never vetted for public consumption — it could be a
        // raw DB/driver error, a file path, etc. Mask it outside
        // development regardless of the status code it happened to map
        // to; development still gets it here, on top of the exception
        // class/file/line already attached in `errors` above.
        if (ENVIRONMENT !== 'development') {
            return 'An unexpected error occurred. Please try again later.';
        }

        return $exception->getMessage();
    }
}
