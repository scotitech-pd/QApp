# Q-App Mobile API Fixtures v1

## Purpose

This document provides example request and response payloads for the current mobile-facing `v1` API.

Use it for:

- mobile app integration work
- API client scaffolding
- QA fixture creation
- contract test design

These examples are illustrative but are aligned to the current backend contract.

## Shared Success Envelope

Single item example:

```json
{
  "data": {
    "id": "example-id"
  },
  "item": {
    "id": "example-id"
  },
  "meta": {
    "requestId": "7f70bb4b-7a29-44be-9c8c-d7d0865e7d21"
  }
}
```

List example:

```json
{
  "data": [],
  "items": [],
  "meta": {
    "count": 0,
    "requestId": "b76fd52a-4fd1-493f-916a-75b58dca7c0c"
  }
}
```

## Shared Error Envelope

```json
{
  "error": "Account is temporarily locked due to repeated failed login attempts.",
  "code": "ACCOUNT_LOCKED",
  "details": {
    "lockedUntil": "2026-06-12T10:30:00.000Z"
  },
  "meta": {
    "requestId": "80952aa1-3e7c-4102-9d28-8e65f3655993"
  }
}
```

## Auth Fixtures

### Login Request

`POST /v1/auth/login`

```json
{
  "identifier": "owner@fadeyard.demo",
  "password": "QappOwner123!",
  "deviceName": "iPhone 16 Pro",
  "platform": "ios"
}
```

### Login Response

```json
{
  "data": {
    "user": {
      "id": "b28c1d91-52b1-4dc4-8d13-cf25372e2b10",
      "appRole": "USER",
      "firstName": "Owen",
      "lastName": "Owner",
      "email": "owner@fadeyard.demo",
      "phone": "+447400000202",
      "memberships": [
        {
          "role": "OWNER",
          "businessGroup": {
            "id": "88d56a4c-37ec-4fa7-a454-03b5dff20f53",
            "name": "Fade Yard",
            "slug": "q-app-demo-group"
          }
        }
      ],
      "staffProfiles": []
    },
    "tokens": {
      "accessToken": "<jwt>",
      "refreshToken": "<opaque-refresh-token>",
      "sessionId": "0f296cfb-4d91-42b2-84d8-b86d6814bdb2",
      "accessTokenExpiresInSeconds": 900,
      "refreshTokenExpiresAt": "2026-07-12T09:15:30.000Z"
    }
  },
  "item": {},
  "meta": {
    "requestId": "6e801e13-7096-4335-bda4-c3fc8e2bbd4a"
  }
}
```

### Session List Response

`GET /v1/auth/sessions`

```json
{
  "data": [
    {
      "id": "0f296cfb-4d91-42b2-84d8-b86d6814bdb2",
      "createdAt": "2026-06-12T09:15:30.000Z",
      "expiresAt": "2026-07-12T09:15:30.000Z",
      "revokedAt": null,
      "lastUsedAt": "2026-06-12T09:15:30.000Z",
      "userAgent": "QApp iOS/1.0",
      "ipAddress": "::ffff:127.0.0.1",
      "deviceName": "iPhone 16 Pro",
      "platform": "ios",
      "isCurrent": true
    }
  ],
  "items": [],
  "meta": {
    "count": 1,
    "requestId": "7bd27783-7c5e-4918-8853-3ff8434a6e63"
  }
}
```

### Auth Activity Response

`GET /v1/auth/activity`

```json
{
  "data": [
    {
      "id": "8fb8eb72-2399-43f5-b8b0-562b636ae4fe",
      "createdAt": "2026-06-12T09:20:11.000Z",
      "type": "LOGIN_SUCCEEDED",
      "identifier": "owner@fadeyard.demo",
      "ipAddress": "::ffff:127.0.0.1",
      "userAgent": "QApp iOS/1.0",
      "deviceName": "iPhone 16 Pro",
      "platform": "ios",
      "metadata": null,
      "sessionId": "0f296cfb-4d91-42b2-84d8-b86d6814bdb2",
      "user": {
        "id": "b28c1d91-52b1-4dc4-8d13-cf25372e2b10",
        "email": "owner@fadeyard.demo",
        "phone": "+447400000202",
        "firstName": "Owen",
        "lastName": "Owner"
      },
      "actorUser": null
    }
  ],
  "items": [],
  "meta": {
    "count": 1,
    "requestId": "0dfb7c01-23b6-4634-90a0-89dbe63b0a49"
  }
}
```

## Discovery Fixtures

### Shop List Response

`GET /v1/shops?latitude=51.5137&longitude=-0.1366`

```json
{
  "data": [
    {
      "id": "6d6f6f60-3a32-4e32-bc8b-c7ca7dfa2a94",
      "slug": "demo-barber",
      "name": "Fade Yard Soho",
      "city": "London",
      "region": null,
      "countryCode": "GB",
      "addressLine1": "24 Berwick Street",
      "postalCode": "W1F 8RG",
      "latitude": 51.5137,
      "longitude": -0.1366,
      "publicDescription": "Live Q-App demo location with a real queue, smart arrival prompts, and operator workflow.",
      "serviceStationsCount": 2,
      "queueEnabled": true,
      "queuePaused": false,
      "industryType": "BARBER",
      "approvalStatus": "APPROVED",
      "distanceKm": 0,
      "queueLength": 4,
      "estimatedWaitMin": 40,
      "bestJoinScore": 40,
      "bestJoinReason": "Balanced by distance and live wait",
      "isFavorite": false,
      "reviewSummary": {
        "averageRating": 4.8,
        "ratingCount": 24
      }
    }
  ],
  "items": [],
  "meta": {
    "count": 1,
    "requestId": "6dbdbdc8-d4ea-4e9a-aa15-d089f07a2fa9"
  }
}
```

### Mark Favourite Response

`PUT /v1/preferences/favorites/demo-barber`

Header:

`X-QApp-Device-Id: qapp-web:demo-device-123456`

```json
{
  "data": {
    "slug": "demo-barber",
    "isFavorite": true
  },
  "item": {
    "slug": "demo-barber",
    "isFavorite": true
  },
  "meta": {
    "requestId": "a9390e9d-901b-4b66-b385-7521db9be644"
  }
}
```

### Shop Detail Response

`GET /v1/shops/demo-barber`

```json
{
  "data": {
    "id": "6d6f6f60-3a32-4e32-bc8b-c7ca7dfa2a94",
    "slug": "demo-barber",
    "name": "Fade Yard Soho",
    "city": "London",
    "region": null,
    "countryCode": "GB",
    "addressLine1": "24 Berwick Street",
    "postalCode": "W1F 8RG",
    "latitude": 51.5137,
    "longitude": -0.1366,
    "publicDescription": "Live Q-App demo location with a real queue, smart arrival prompts, and operator workflow.",
    "serviceStationsCount": 2,
    "queueEnabled": true,
    "queuePaused": false,
    "industryType": "BARBER",
    "approvalStatus": "APPROVED",
    "distanceKm": null,
    "queueLength": 4,
    "estimatedWaitMin": 40,
    "bestJoinScore": 52,
    "bestJoinReason": "Selected shop",
    "isFavorite": false,
    "reviewSummary": {
      "averageRating": 4.8,
      "ratingCount": 24
    },
    "reviews": [
      {
        "id": "review-id-1",
        "rating": 5,
        "comment": "Got the leave-now alert at exactly the right time.",
        "createdAt": "2026-06-12T10:15:00.000Z",
        "customerName": "Amir"
      },
      {
        "id": "review-id-2",
        "rating": 4,
        "comment": "Easy queue, no standing around outside.",
        "createdAt": "2026-06-11T16:30:00.000Z",
        "customerName": "Sofia"
      }
    ]
  },
  "item": {},
  "meta": {
    "requestId": "1b49a8d2-b308-4f75-bd8b-b5595bb89f4f"
  }
}
```

## Queue Join Fixtures

### Queue Join Start Request

`POST /v1/queue/join/start`

```json
{
  "shopSlug": "demo-barber",
  "firstName": "Amir",
  "mobileNumber": "+447400000301"
}
```

### Queue Join Start Response

```json
{
  "data": {
    "challengeId": "ec2dd8fe-f090-44be-83f0-e5dbff859748",
    "expiresAt": "2026-06-12T09:30:00.000Z",
    "message": "Verification code created. SMS is currently using preview mode.",
    "deliveryMode": "preview",
    "deliveryReason": "twilio_not_configured",
    "codePreview": "123456"
  },
  "item": {},
  "meta": {
    "requestId": "889ef7fb-8fd5-43fd-a351-a552bbcc6df5"
  }
}
```

### Queue Join Verify Response

`POST /v1/queue/join/verify`

```json
{
  "data": {
    "alreadyJoined": false,
    "queueStatus": {
      "trackingToken": "demo-queue-amir",
      "sortIndex": 1,
      "joinedAt": "2026-06-12T09:21:00.000Z",
      "confirmationStatus": "PENDING",
      "confirmationRequestedAt": null,
      "confirmationRespondedAt": null,
      "calledAt": null,
      "visitStatus": "QUEUED",
      "plannedDurationMin": 20,
      "estimatedWaitMin": 18,
      "actualDurationMin": null,
      "queueJoinedAt": "2026-06-12T09:21:00.000Z",
      "readyAt": null,
      "startedAt": null,
      "completedAt": null,
      "feedbackSubmitted": false,
      "customer": {
        "firstName": "Amir"
      },
      "shop": {
        "id": "6d6f6f60-3a32-4e32-bc8b-c7ca7dfa2a94",
        "slug": "demo-barber",
        "name": "Fade Yard Soho",
        "city": "London",
        "queuePaused": false,
        "calledGracePeriodMin": 5
      },
      "position": 1,
      "queueLength": 4,
      "nearTurnNotifiedAt": null,
      "arrivalConfirmationSentAt": null,
      "responseWindowEndsAt": null,
      "canRespondToArrival": false
    }
  },
  "item": {},
  "meta": {
    "requestId": "5b9de2de-d263-444f-bfe7-f3552897cce7"
  }
}
```

### Queue Status Response

`GET /v1/queue/status/demo-queue-amir`

```json
{
  "data": {
    "trackingToken": "demo-queue-amir",
    "sortIndex": 1,
    "joinedAt": "2026-06-12T09:21:00.000Z",
    "confirmationStatus": "PENDING",
    "confirmationRequestedAt": "2026-06-12T09:32:00.000Z",
    "confirmationRespondedAt": null,
    "calledAt": null,
    "visitStatus": "CONFIRMATION_PENDING",
    "plannedDurationMin": 20,
    "estimatedWaitMin": 8,
    "actualDurationMin": null,
    "queueJoinedAt": "2026-06-12T09:21:00.000Z",
    "readyAt": null,
    "startedAt": null,
    "completedAt": null,
    "feedbackSubmitted": false,
    "customer": {
      "firstName": "Amir"
    },
    "shop": {
      "id": "6d6f6f60-3a32-4e32-bc8b-c7ca7dfa2a94",
      "slug": "demo-barber",
      "name": "Fade Yard Soho",
      "city": "London",
      "queuePaused": false,
      "calledGracePeriodMin": 5
    },
    "position": 1,
    "queueLength": 2,
    "nearTurnNotifiedAt": "2026-06-12T09:31:30.000Z",
    "arrivalConfirmationSentAt": "2026-06-12T09:32:00.000Z",
    "responseWindowEndsAt": "2026-06-12T09:37:00.000Z",
    "canRespondToArrival": true
  },
  "item": {},
  "meta": {
    "requestId": "9344d1a0-a2c4-4b13-885d-b1d9af0122ef"
  }
}
```

### Arrival Response Request

`POST /v1/queue/status/demo-queue-amir/respond-arrival`

```json
{
  "response": "COMING"
}
```

### Leave Queue Response

`POST /v1/queue/status/demo-queue-joel/leave`

```json
{
  "data": {
    "trackingToken": "demo-queue-joel",
    "visitStatus": "CANCELLED",
    "releasedAt": "2026-06-12T09:29:00.000Z",
    "message": "Your queue place has been released."
  },
  "item": {},
  "meta": {
    "requestId": "cc6d0d94-476e-47e3-a8b4-44ca5c9398ce"
  }
}
```

### Queue Feedback Request

`POST /v1/queue/status/demo-queue-amir/feedback`

```json
{
  "rating": 5,
  "comment": "Easy to join and I did not have to wait inside."
}
```

### Queue Feedback Response

```json
{
  "data": {
    "feedbackSubmitted": true,
    "message": "Thanks for helping this shop improve."
  },
  "item": {},
  "meta": {
    "requestId": "ca083874-715e-4b9d-8ac2-f8c944c59032"
  }
}
```

### Arrival Response Result

```json
{
  "data": {
    "trackingToken": "demo-queue-amir",
    "response": "COMING"
  },
  "item": {},
  "meta": {
    "requestId": "d7be0a3b-ef6d-460b-9168-833db889bc63"
  }
}
```

## Operator Fixtures

### Queue Dashboard Response

`GET /v1/ops/shops/demo-barber/dashboard`

```json
{
  "data": {
    "shop": {
      "id": "6d6f6f60-3a32-4e32-bc8b-c7ca7dfa2a94",
      "slug": "demo-barber",
      "name": "Fade Yard Soho",
      "queuePaused": false,
      "queuePauseReason": null,
      "queueEnabled": true,
      "defaultWalkInDurationMin": 20,
      "serviceStationsCount": 2,
      "nearTurnPositionTrigger": 2,
      "nearTurnEtaTriggerMin": 15,
      "calledGracePeriodMin": 5
    },
    "queueEntries": [
      {
        "id": "85e04d83-f5d1-4d6d-b235-d32647bb6b7c",
        "trackingToken": "demo-queue-amir",
        "sortIndex": 1,
        "joinedAt": "2026-06-12T09:21:00.000Z",
        "confirmationStatus": "PENDING",
        "confirmationRequestedAt": null,
        "confirmationRespondedAt": null,
        "calledAt": null,
        "missedAt": null,
        "releasedAt": null,
        "removedAt": null,
        "visit": {
          "id": "d7c3960e-2a0b-4d88-b364-5faf942f4954",
          "source": "REMOTE_QUEUE",
          "status": "QUEUED",
          "plannedDurationMin": 20,
          "estimatedWaitMin": 20,
          "queueJoinedAt": "2026-06-12T09:21:00.000Z",
          "customer": {
            "id": "06a2ad2d-02c1-4d19-b7a7-a917f45f8329",
            "firstName": "Amir",
            "phone": "+447400000301"
          }
        }
      }
    ],
    "inServiceVisits": [],
    "missedQueueEntries": [
      {
        "id": "missed-queue-id",
        "trackingToken": "demo-queue-late-customer",
        "sortIndex": 1,
        "joinedAt": "2026-06-12T09:02:00.000Z",
        "confirmationStatus": "EXPIRED",
        "confirmationRequestedAt": "2026-06-12T09:30:00.000Z",
        "confirmationRespondedAt": "2026-06-12T09:35:00.000Z",
        "calledAt": null,
        "missedAt": "2026-06-12T09:35:00.000Z",
        "releasedAt": "2026-06-12T09:35:00.000Z",
        "removedAt": null,
        "visit": {
          "id": "missed-visit-id",
          "source": "REMOTE_QUEUE",
          "status": "NO_SHOW",
          "plannedDurationMin": 20,
          "estimatedWaitMin": 0,
          "queueJoinedAt": "2026-06-12T09:02:00.000Z",
          "customer": {
            "id": "missed-customer-id",
            "firstName": "Ravi",
            "phone": "+447400000399"
          }
        }
      }
    ],
    "reviewSummary": {
      "averageRating": 4.8,
      "ratingCount": 24
    },
    "recentReviews": [
      {
        "id": "review-id-1",
        "rating": 5,
        "comment": "Got the leave-now alert at exactly the right time.",
        "createdAt": "2026-06-12T10:15:00.000Z",
        "customerName": "Amir"
      }
    ]
  },
  "item": {},
  "meta": {
    "requestId": "5b6e483e-f4ea-4851-bf59-ddd2bcdc8189"
  }
}
```

### Add Walk-In Request

`POST /v1/ops/shops/demo-barber/walk-ins`

```json
{
  "firstName": "Jordan",
  "mobileNumber": "+447400000355",
  "plannedDurationMin": 25,
  "reason": "Accepted walk-in between queue gaps"
}
```

### Pause Queue Result

`POST /v1/ops/shops/demo-barber/pause-queue`

```json
{
  "data": {
    "slug": "demo-barber",
    "queuePaused": true,
    "queuePauseReason": "Staff break"
  },
  "item": {},
  "meta": {
    "requestId": "c7a9e233-4763-4f02-a9d5-a83adf9cb2c5"
  }
}
```

### Release No-Show Result

`POST /v1/ops/shops/demo-barber/queue/demo-queue-amir/release-no-show`

```json
{
  "data": {
    "trackingToken": "demo-queue-amir",
    "visitStatus": "NO_SHOW",
    "releasedAt": "2026-06-12T09:37:00.000Z",
    "reason": "Customer did not arrive when called"
  },
  "item": {},
  "meta": {
    "requestId": "57f1c3f3-80f9-4eaf-9900-4e4146f56d44"
  }
}
```

### Reinstate Missed Customer Result

`POST /v1/ops/shops/demo-barber/queue/demo-queue-late-customer/reinstate`

```json
{
  "data": {
    "trackingToken": "demo-queue-late-customer",
    "visitStatus": "READY",
    "sortIndex": 1,
    "reinstatedAt": "2026-06-12T09:42:00.000Z",
    "reason": "Customer arrived after missed turn"
  },
  "item": {},
  "meta": {
    "requestId": "f537aa83-fb44-4e7c-a97a-841a9e239aac"
  }
}
```

## Invitation Fixtures

### Create Invitation Request

`POST /v1/ops/shops/demo-barber/invitations`

```json
{
  "email": "staff@shop.example",
  "firstName": "Sam",
  "lastName": "Operator",
  "role": "STAFF_OPERATOR",
  "note": "Front queue operations"
}
```

### Create Invitation Response

```json
{
  "data": {
    "id": "7c1d9b4e-b52f-49be-824d-4d556a2e280d",
    "email": "staff@shop.example",
    "firstName": "Sam",
    "lastName": "Operator",
    "role": "STAFF_OPERATOR",
    "note": "Front queue operations",
    "createdAt": "2026-06-12T09:40:00.000Z",
    "expiresAt": "2026-06-19T09:40:00.000Z",
    "acceptedAt": null,
    "revokedAt": null,
    "businessGroup": {
      "id": "88d56a4c-37ec-4fa7-a454-03b5dff20f53",
      "name": "Fade Yard",
      "slug": "q-app-demo-group"
    },
    "businessLocation": {
      "id": "6d6f6f60-3a32-4e32-bc8b-c7ca7dfa2a94",
      "name": "Fade Yard Soho",
      "slug": "demo-barber"
    },
    "inviteToken": "<dev-token>",
    "inviteUrl": "http://127.0.0.1:3000/invite/<dev-token>"
  },
  "item": {},
  "meta": {
    "requestId": "9e406d25-b446-4a63-a3c5-c72bdd7fcb2f"
  }
}
```

### Accept Invitation Request

`POST /v1/auth/invitations/:token/accept`

```json
{
  "firstName": "Sam",
  "lastName": "Operator",
  "password": "QappInviteStrong123!"
}
```

## Signup Fixture

### Business Signup Request

`POST /v1/business-signups`

```json
{
  "businessName": "Camden Chair Studio",
  "ownerName": "Jordan Miles",
  "mobileNumber": "+447400000106",
  "email": "owner@camdenchair.demo",
  "addressLine1": "88 Parkway",
  "city": "London",
  "region": "Greater London",
  "postalCode": "NW1 7AN",
  "countryCode": "GB",
  "industryType": "SALON",
  "serviceStationsCount": 3,
  "openingHoursNote": "Mon-Sat 10:00-19:00",
  "latitude": 51.5387,
  "longitude": -0.1426,
  "placeId": "place-demo-123",
  "geolocationSource": "ADDRESS_GEOCODE",
  "pinConfirmedAt": "2026-06-12T09:45:00.000Z"
}
```

## Fixture Guidance

Mobile teams should treat these examples as:

- payload shape guidance
- field naming guidance
- contract-test seed material

Mobile teams should not assume:

- example ids will stay the same
- list ordering is guaranteed unless documented
- preview-only dev fields exist in production
