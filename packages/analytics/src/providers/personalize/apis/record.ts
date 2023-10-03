// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RecordInput } from '../types';
import {
	autoTrackMedia,
	getEventBuffer,
	resolveCachedSession,
	resolveConfig,
	updateCachedSession,
} from '../utils';
import { isAnalyticsEnabled, resolveCredentials } from '../../../utils';
import { ConsoleLogger } from '@aws-amplify/core/internals/utils';
import {
	IDENTIFY_EVENT_TYPE,
	MEDIA_AUTO_TRACK_EVENT_TYPE,
} from '../utils/constants';

const logger = new ConsoleLogger('Personalize');

export const record = ({
	userId,
	eventId,
	eventType,
	properties,
}: RecordInput): void => {
	if (!isAnalyticsEnabled()) {
		logger.debug('Analytics is disabled, event will not be recorded.');
		return;
	}

	const { region, trackingId, bufferSize, flushSize, flushInterval } =
		resolveConfig();
	resolveCredentials()
		.then(({ credentials, identityId }) => {
			const timestamp = Date.now();
			const { sessionId: cachedSessionId, userId: cachedUserId } =
				resolveCachedSession(trackingId);
			if (eventType === IDENTIFY_EVENT_TYPE) {
				updateCachedSession(
					typeof properties.userId === 'string' ? properties.userId : '',
					cachedSessionId,
					cachedUserId
				);
			} else if (!!userId) {
				updateCachedSession(userId, cachedSessionId, cachedUserId);
			}

			const { sessionId: updatedSessionId, userId: updatedUserId } =
				resolveCachedSession(trackingId);

			const eventBuffer = getEventBuffer({
				region,
				flushSize,
				flushInterval,
				bufferSize,
				credentials,
				identityId,
			});

			if (eventType === MEDIA_AUTO_TRACK_EVENT_TYPE) {
				autoTrackMedia(
					{
						trackingId,
						sessionId: updatedSessionId,
						userId: updatedUserId,
						event: {
							eventId,
							eventType,
							properties,
						},
					},
					eventBuffer
				);
			} else {
				eventBuffer.append({
					trackingId,
					sessionId: updatedSessionId,
					userId: updatedUserId,
					event: {
						eventId,
						eventType,
						properties,
					},
					timestamp,
				});
			}

			if (eventBuffer.length >= bufferSize) {
				eventBuffer.flushAll();
			}
		})
		.catch(e => {
			logger.warn('Failed to record event.', e);
		});
};