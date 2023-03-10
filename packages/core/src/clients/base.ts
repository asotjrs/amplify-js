import { jitteredBackOffRetry, RetryOptions } from './middleware/retry';
import { composeTransferClient } from './internal/client';
import { fetchTransferClient } from './fetch';
import { HttpRequest, HttpResponse } from './types/http';
import { userAgent, UserAgentOptions } from './middleware/user-agent';

export const httpTransferClient = composeTransferClient<
	HttpRequest,
	HttpResponse,
	typeof fetchTransferClient,
	[RetryOptions, UserAgentOptions]
>(fetchTransferClient, [jitteredBackOffRetry(), userAgent]);