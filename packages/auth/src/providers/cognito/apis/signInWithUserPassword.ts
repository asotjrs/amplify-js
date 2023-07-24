// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthValidationErrorCode } from '../../../errors/types/validation';
import { assertServiceError } from '../../../errors/utils/assertServiceError';
import { assertValidationError } from '../../../errors/utils/assertValidationError';
import {
	AuthSignInResult,
	AuthSignInStep,
	SignInRequest,
} from '../../../types';
import {
	ChallengeName,
	ChallengeParameters,
} from '../utils/clients/types/models';
import {
	getSignInResult,
	getSignInResultFromError,
	handleUserPasswordAuthFlow,
} from '../utils/signInHelpers';
import { Amplify } from '@aws-amplify/core';
import { InitiateAuthException } from '../types/errors';
import { CognitoSignInOptions } from '../types';
import {
	cleanActiveSignInState, setActiveSignInState
} from '../utils/signInStore';

/**
 * Signs a user in using USER_PASSWORD_AUTH AuthFlowType
 *
 * @param signInRequest - The SignInRequest object
 * @returns AuthSignInResult
 * @throws service: {@link InitiateAuthException } - Cognito service error thrown during the sign-in process.
 * @throws validation: {@link AuthValidationErrorCode  } - Validation errors thrown when either username or password
 *  are not defined.
 *
 * TODO: add config errors
 */
export async function signInWithUserPassword(
	signInRequest: SignInRequest<CognitoSignInOptions>
): Promise<AuthSignInResult> {
	const { username, password, options } = signInRequest;
	const clientMetadata = Amplify.config.clientMetadata;
	const metadata = options?.serviceOptions?.clientMetadata || clientMetadata;
	assertValidationError(
		!!username,
		AuthValidationErrorCode.EmptySignInUsername
	);
	assertValidationError(
		!!password,
		AuthValidationErrorCode.EmptySignInPassword
	);

	try {
		const {
			ChallengeName,
			ChallengeParameters,
			AuthenticationResult,
			Session,
		} = await handleUserPasswordAuthFlow(username, password, metadata);

		// sets up local state used during the sign-in process
		setActiveSignInState({
			signInSession: Session,
			username,
			challengeName: ChallengeName as ChallengeName,
		});
		if (AuthenticationResult) {
			// TODO(israx): cache tokens
			cleanActiveSignInState();
			return {
				isSignedIn: true,
				nextStep: { signInStep: AuthSignInStep.DONE },
			};
		}

		// TODO(israx): set AmplifyUserSession via singleton
		return getSignInResult({
			challengeName: ChallengeName as ChallengeName,
			challengeParameters: ChallengeParameters as ChallengeParameters,
		});
	} catch (error) {
		cleanActiveSignInState();
		assertServiceError(error);
		const result = getSignInResultFromError(error.name);
		if (result) return result;
		throw error;
	}
}