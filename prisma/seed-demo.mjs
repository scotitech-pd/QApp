import "dotenv/config";
import crypto from "node:crypto";

import { PrismaClient, ApprovalStatus, AppRole, GeolocationSource, IndustryType, LocationStatus, MembershipRole, NotificationChannel, NotificationStatus, NotificationType, VisitSource, VisitStatus, ArrivalResponseStatus } from "@prisma/client";

const prisma = new PrismaClient();

const demoGroupSlug = "q-app-demo-group";
const demoLocationSlug = "demo-barber";
const extraDemoLocations = [
  {
    groupSlug: "q-app-demo-nails",
    groupName: "Gloss Room",
    slug: "gloss-room-soho",
    name: "Gloss Room Soho",
    industryType: IndustryType.NAIL_STUDIO,
    addressLine1: "12 Kingly Court",
    city: "London",
    postalCode: "W1B 5PW",
    latitude: 51.5139,
    longitude: -0.1397,
    stations: 3,
    duration: 15,
    queue: [
      { firstName: "Priya", phone: "+447400000401", minutesAgo: 9 },
      { firstName: "Evie", phone: "+447400000402", minutesAgo: 3 }
    ],
    reviews: [
      { firstName: "Aaliyah", phone: "+447400000403", rating: 5, comment: "Closest option and the queue estimate was honest." },
      { firstName: "Marta", phone: "+447400000404", rating: 5, comment: "Joined while shopping nearby and arrived just in time." }
    ]
  },
  {
    groupSlug: "q-app-demo-salon",
    groupName: "Copper & Comb",
    slug: "copper-comb-covent-garden",
    name: "Copper & Comb Covent Garden",
    industryType: IndustryType.SALON,
    addressLine1: "31 Neal Street",
    city: "London",
    postalCode: "WC2H 9PR",
    latitude: 51.5148,
    longitude: -0.1269,
    stations: 4,
    duration: 30,
    queue: [
      { firstName: "Harper", phone: "+447400000405", minutesAgo: 18 },
      { firstName: "Ravi", phone: "+447400000406", minutesAgo: 10 },
      { firstName: "Mila", phone: "+447400000407", minutesAgo: 4 }
    ],
    reviews: [
      { firstName: "Jess", phone: "+447400000408", rating: 4, comment: "Good updates and no crowd at reception." }
    ]
  },
  {
    groupSlug: "q-app-demo-physio",
    groupName: "Motion Clinic",
    slug: "motion-clinic-fitzrovia",
    name: "Motion Clinic Fitzrovia",
    industryType: IndustryType.PHYSIOTHERAPY_CLINIC,
    addressLine1: "44 Goodge Street",
    city: "London",
    postalCode: "W1T 4LU",
    latitude: 51.5196,
    longitude: -0.1366,
    stations: 2,
    duration: 25,
    queue: [],
    reviews: [
      { firstName: "Noah", phone: "+447400000409", rating: 5, comment: "I saw zero wait before walking over." },
      { firstName: "Leah", phone: "+447400000410", rating: 4, comment: "Useful for quick follow-up appointments." }
    ]
  },
  {
    groupSlug: "q-app-demo-tattoo",
    groupName: "Ink Lane",
    slug: "ink-lane-soho",
    name: "Ink Lane Soho",
    industryType: IndustryType.TATTOO_STUDIO,
    addressLine1: "9 Brewer Street",
    city: "London",
    postalCode: "W1F 0RG",
    latitude: 51.5118,
    longitude: -0.1355,
    stations: 2,
    duration: 45,
    queue: [
      { firstName: "Kai", phone: "+447400000411", minutesAgo: 12 }
    ],
    reviews: [
      { firstName: "Dion", phone: "+447400000412", rating: 5, comment: "Great for walk-in flash slots without hanging around." }
    ]
  },
  {
    groupSlug: "q-app-demo-carwash",
    groupName: "Rapid Rinse",
    slug: "rapid-rinse-marylebone",
    name: "Rapid Rinse Marylebone",
    industryType: IndustryType.CAR_WASH,
    addressLine1: "101 Great Portland Street",
    city: "London",
    postalCode: "W1W 6QF",
    latitude: 51.5209,
    longitude: -0.1436,
    stations: 2,
    duration: 20,
    queue: [
      { firstName: "Car 1", phone: "+447400000413", minutesAgo: 20 },
      { firstName: "Car 2", phone: "+447400000414", minutesAgo: 13 },
      { firstName: "Car 3", phone: "+447400000415", minutesAgo: 6 }
    ],
    reviews: [
      { firstName: "Omar", phone: "+447400000416", rating: 4, comment: "Could see it was busy before driving there." }
    ]
  },
  {
    groupSlug: "q-app-demo-dental",
    groupName: "Bright Slot Dental",
    slug: "bright-slot-dental-holborn",
    name: "Bright Slot Dental Holborn",
    industryType: IndustryType.DENTAL_CLINIC,
    addressLine1: "58 High Holborn",
    city: "London",
    postalCode: "WC1V 6DX",
    latitude: 51.5184,
    longitude: -0.1209,
    stations: 1,
    duration: 20,
    queue: [
      { firstName: "Iris", phone: "+447400000417", minutesAgo: 14 }
    ],
    reviews: [
      { firstName: "Ben", phone: "+447400000418", rating: 5, comment: "The wait estimate helped me time my lunch break." }
    ]
  }
];

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function resetLocationData(locationId) {
  const visits = await prisma.visit.findMany({
    where: {
      businessLocationId: locationId
    },
    select: {
      id: true
    }
  });

  const visitIds = visits.map((visit) => visit.id);

  await prisma.notificationEvent.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });

  await prisma.customerReview.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });

  await prisma.operationalEvent.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });

  await prisma.verificationChallenge.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });

  if (visitIds.length > 0) {
    await prisma.serviceAdjustment.deleteMany({
      where: {
        visitId: {
          in: visitIds
        }
      }
    });

    await prisma.payment.deleteMany({
      where: {
        visitId: {
          in: visitIds
        }
      }
    });

    await prisma.reservation.deleteMany({
      where: {
        visitId: {
          in: visitIds
        }
      }
    });
  }

  await prisma.queueEntry.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });

  await prisma.visit.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });

  await prisma.service.deleteMany({
    where: {
      businessLocationId: locationId
    }
  });
}

async function upsertCustomer(input) {
  return prisma.customer.upsert({
    where: {
      phone: input.phone
    },
    update: {
      firstName: input.firstName,
      phoneVerifiedAt: new Date()
    },
    create: {
      firstName: input.firstName,
      phone: input.phone,
      phoneVerifiedAt: new Date()
    }
  });
}

async function upsertUser(input) {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.upsert({
    where: {
      email: input.email
    },
    update: {
      appRole: input.appRole,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    },
    create: {
      appRole: input.appRole,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
}

async function seedDemoBusiness() {
  const businessGroup = await prisma.businessGroup.upsert({
    where: {
      slug: demoGroupSlug
    },
    update: {
      name: "Fade Yard",
      industryType: IndustryType.BARBER,
      approvalStatus: ApprovalStatus.APPROVED,
      notes: "Reusable Q-App demo group"
    },
    create: {
      slug: demoGroupSlug,
      name: "Fade Yard",
      industryType: IndustryType.BARBER,
      approvalStatus: ApprovalStatus.APPROVED,
      notes: "Reusable Q-App demo group"
    }
  });

  const businessLocation = await prisma.businessLocation.upsert({
    where: {
      slug: demoLocationSlug
    },
    update: {
      businessGroupId: businessGroup.id,
      name: "Fade Yard Soho",
      status: LocationStatus.LIVE,
      isPublic: true,
      publicDescription: "Live Q-App demo location with a real queue, smart arrival prompts, and operator workflow.",
      phone: "+447400000100",
      email: "soho@faydyard.demo",
      timezone: "Europe/London",
      addressLine1: "24 Berwick Street",
      city: "London",
      postalCode: "W1F 8RG",
      countryCode: "GB",
      latitude: 51.5137,
      longitude: -0.1366,
      geolocationSource: GeolocationSource.MANUAL_PIN,
      geolocationCapturedAt: new Date(),
      pinConfirmedAt: new Date(),
      queueEnabled: true,
      bookingsEnabled: false,
      queuePaused: false,
      serviceStationsCount: 2,
      defaultWalkInDurationMin: 20,
      nearTurnPositionTrigger: 2,
      nearTurnEtaTriggerMin: 15,
      calledGracePeriodMin: 5,
      onboardingCompletedAt: new Date(),
      approvedAt: new Date(),
      openingHours: {
        monday: "09:00-19:00",
        tuesday: "09:00-19:00",
        wednesday: "09:00-19:00",
        thursday: "09:00-20:00",
        friday: "09:00-20:00",
        saturday: "09:00-18:00",
        sunday: "11:00-17:00"
      }
    },
    create: {
      businessGroupId: businessGroup.id,
      slug: demoLocationSlug,
      name: "Fade Yard Soho",
      status: LocationStatus.LIVE,
      isPublic: true,
      publicDescription: "Live Q-App demo location with a real queue, smart arrival prompts, and operator workflow.",
      phone: "+447400000100",
      email: "soho@faydyard.demo",
      timezone: "Europe/London",
      addressLine1: "24 Berwick Street",
      city: "London",
      postalCode: "W1F 8RG",
      countryCode: "GB",
      latitude: 51.5137,
      longitude: -0.1366,
      geolocationSource: GeolocationSource.MANUAL_PIN,
      geolocationCapturedAt: new Date(),
      pinConfirmedAt: new Date(),
      queueEnabled: true,
      bookingsEnabled: false,
      queuePaused: false,
      serviceStationsCount: 2,
      defaultWalkInDurationMin: 20,
      nearTurnPositionTrigger: 2,
      nearTurnEtaTriggerMin: 15,
      calledGracePeriodMin: 5,
      onboardingCompletedAt: new Date(),
      approvedAt: new Date(),
      openingHours: {
        monday: "09:00-19:00",
        tuesday: "09:00-19:00",
        wednesday: "09:00-19:00",
        thursday: "09:00-20:00",
        friday: "09:00-20:00",
        saturday: "09:00-18:00",
        sunday: "11:00-17:00"
      }
    }
  });

  const [platformAdmin, ownerUser, managerUser, operatorUser] = await Promise.all([
    upsertUser({
      appRole: AppRole.PLATFORM_ADMIN,
      firstName: "Ava",
      lastName: "Admin",
      email: "admin@qapp.demo",
      phone: "+447400000201",
      password: "QappAdmin123!"
    }),
    upsertUser({
      appRole: AppRole.USER,
      firstName: "Owen",
      lastName: "Owner",
      email: "owner@fadeyard.demo",
      phone: "+447400000202",
      password: "QappOwner123!"
    }),
    upsertUser({
      appRole: AppRole.USER,
      firstName: "Mina",
      lastName: "Manager",
      email: "manager@fadeyard.demo",
      phone: "+447400000203",
      password: "QappManager123!"
    }),
    upsertUser({
      appRole: AppRole.USER,
      firstName: "Sam",
      lastName: "Operator",
      email: "staff@fadeyard.demo",
      phone: "+447400000204",
      password: "QappStaff123!"
    })
  ]);

  await prisma.authSession.deleteMany({
    where: {
      userId: {
        in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
      }
    }
  });

  await prisma.authAuditEvent.deleteMany({
    where: {
      userId: {
        in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
      }
    }
  });

  await prisma.securityCaseNote.deleteMany({
    where: {
      OR: [
        {
          authorUserId: {
            in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
          }
        },
        {
          securityCase: {
            targetUserId: {
              in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
            }
          }
        }
      ]
    }
  });

  await prisma.securityAlert.deleteMany({
    where: {
      targetUserId: {
        in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
      }
    }
  });

  await prisma.securityCase.deleteMany({
    where: {
      targetUserId: {
        in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
      }
    }
  });

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: {
        in: [platformAdmin.id, ownerUser.id, managerUser.id, operatorUser.id]
      }
    }
  });

  await prisma.businessMembership.deleteMany({
    where: {
      businessGroupId: businessGroup.id
    }
  });

  await prisma.staffMember.deleteMany({
    where: {
      businessLocationId: businessLocation.id
    }
  });

  await prisma.businessMembership.createMany({
    data: [
      {
        businessGroupId: businessGroup.id,
        userId: ownerUser.id,
        role: MembershipRole.OWNER,
        acceptedAt: new Date()
      },
      {
        businessGroupId: businessGroup.id,
        userId: managerUser.id,
        role: MembershipRole.MANAGER,
        acceptedAt: new Date()
      },
      {
        businessGroupId: businessGroup.id,
        userId: operatorUser.id,
        role: MembershipRole.STAFF_OPERATOR,
        acceptedAt: new Date()
      }
    ]
  });

  await prisma.staffMember.createMany({
    data: [
      {
        businessLocationId: businessLocation.id,
        userId: managerUser.id,
        displayName: "Mina Manager",
        sortOrder: 1,
        skillTags: ["queue", "bookings"]
      },
      {
        businessLocationId: businessLocation.id,
        userId: operatorUser.id,
        displayName: "Sam Operator",
        sortOrder: 2,
        skillTags: ["queue"]
      }
    ]
  });

  await resetLocationData(businessLocation.id);

  const classicCut = await prisma.service.create({
    data: {
      businessLocationId: businessLocation.id,
      name: "Classic Cut",
      category: "Haircut",
      description: "Standard barber cut for the demo queue",
      defaultDurationMin: 20,
      isQueueable: true,
      isBookable: false,
      isActive: true
    }
  });

  const [maya, amir, joel, sana, liam, nisha, theo] = await Promise.all([
    upsertCustomer({ firstName: "Maya", phone: "+447400000101" }),
    upsertCustomer({ firstName: "Amir", phone: "+447400000102" }),
    upsertCustomer({ firstName: "Joel", phone: "+447400000103" }),
    upsertCustomer({ firstName: "Sana", phone: "+447400000104" }),
    upsertCustomer({ firstName: "Liam", phone: "+447400000105" }),
    upsertCustomer({ firstName: "Nisha", phone: "+447400000107" }),
    upsertCustomer({ firstName: "Theo", phone: "+447400000108" })
  ]);

  const now = Date.now();
  const joinedAt = (minutesAgo) => new Date(now - minutesAgo * 60_000);

  const completedVisits = [
    {
      customer: nisha,
      rating: 5,
      comment: "Got the leave-now alert at exactly the right time. No standing around outside.",
      joinedMinutesAgo: 150,
      startedMinutesAgo: 122,
      completedMinutesAgo: 102,
      actualDurationMin: 20
    },
    {
      customer: theo,
      rating: 4,
      comment: "Easy queue and clear updates when the barber was running a bit late.",
      joinedMinutesAgo: 220,
      startedMinutesAgo: 184,
      completedMinutesAgo: 162,
      actualDurationMin: 22
    }
  ];

  for (const completedVisit of completedVisits) {
    const visit = await prisma.visit.create({
      data: {
        businessLocationId: businessLocation.id,
        customerId: completedVisit.customer.id,
        serviceId: classicCut.id,
        source: VisitSource.REMOTE_QUEUE,
        status: VisitStatus.COMPLETED,
        plannedDurationMin: 20,
        actualDurationMin: completedVisit.actualDurationMin,
        estimatedWaitMin: 20,
        queueJoinedAt: joinedAt(completedVisit.joinedMinutesAgo),
        readyAt: joinedAt(completedVisit.startedMinutesAgo + 3),
        startedAt: joinedAt(completedVisit.startedMinutesAgo),
        completedAt: joinedAt(completedVisit.completedMinutesAgo)
      }
    });

    await prisma.customerReview.create({
      data: {
        businessLocationId: businessLocation.id,
        visitId: visit.id,
        customerId: completedVisit.customer.id,
        rating: completedVisit.rating,
        comment: completedVisit.comment,
        isPublic: true
      }
    });
  }

  await prisma.visit.create({
    data: {
      businessLocationId: businessLocation.id,
      customerId: maya.id,
      serviceId: classicCut.id,
      source: VisitSource.REMOTE_QUEUE,
      status: VisitStatus.IN_SERVICE,
      plannedDurationMin: 20,
      actualDurationMin: null,
      estimatedWaitMin: 0,
      queueJoinedAt: joinedAt(35),
      readyAt: joinedAt(14),
      startedAt: joinedAt(12)
    }
  });

  const frontVisit = await prisma.visit.create({
    data: {
      businessLocationId: businessLocation.id,
      customerId: amir.id,
      serviceId: classicCut.id,
      source: VisitSource.REMOTE_QUEUE,
      status: VisitStatus.CONFIRMATION_PENDING,
      plannedDurationMin: 20,
      estimatedWaitMin: 4,
      queueJoinedAt: joinedAt(24)
    }
  });

  await prisma.queueEntry.create({
    data: {
      visitId: frontVisit.id,
      businessLocationId: businessLocation.id,
      trackingToken: "demo-queue-amir",
      sortIndex: 1,
      joinedAt: joinedAt(24),
      confirmationStatus: ArrivalResponseStatus.PENDING,
      confirmationRequestedAt: joinedAt(2)
    }
  });

  const queuedEntries = [
    {
      customer: joel,
      token: "demo-queue-joel",
      sortIndex: 2,
      estimatedWaitMin: 18,
      joinedMinutesAgo: 19,
      source: VisitSource.REMOTE_QUEUE,
      isWalkIn: false
    },
    {
      customer: sana,
      token: "demo-queue-sana",
      sortIndex: 3,
      estimatedWaitMin: 28,
      joinedMinutesAgo: 12,
      source: VisitSource.WALK_IN,
      isWalkIn: true
    },
    {
      customer: liam,
      token: "demo-queue-liam",
      sortIndex: 4,
      estimatedWaitMin: 38,
      joinedMinutesAgo: 8,
      source: VisitSource.REMOTE_QUEUE,
      isWalkIn: false
    }
  ];

  for (const entry of queuedEntries) {
    const visit = await prisma.visit.create({
      data: {
        businessLocationId: businessLocation.id,
        customerId: entry.customer.id,
        serviceId: classicCut.id,
        source: entry.source,
        status: VisitStatus.QUEUED,
        plannedDurationMin: 20,
        estimatedWaitMin: entry.estimatedWaitMin,
        queueJoinedAt: joinedAt(entry.joinedMinutesAgo)
      }
    });

    await prisma.queueEntry.create({
      data: {
        visitId: visit.id,
        businessLocationId: businessLocation.id,
        trackingToken: entry.token,
        sortIndex: entry.sortIndex,
        joinedAt: joinedAt(entry.joinedMinutesAgo),
        isWalkIn: entry.isWalkIn,
        manualInsertReason: entry.isWalkIn ? "Walk-in accepted by staff" : null
      }
    });
  }

  await prisma.notificationEvent.create({
    data: {
      businessLocationId: businessLocation.id,
      visitId: frontVisit.id,
      customerId: amir.id,
      type: NotificationType.ARRIVAL_CONFIRMATION,
      channel: NotificationChannel.SMS,
      status: NotificationStatus.SENT,
      target: amir.phone,
      sentAt: joinedAt(2),
      payload: {
        trackingToken: "demo-queue-amir",
        responseWindowMin: 5
      }
    }
  });

  return businessLocation;
}

async function seedExtraDemoLocations() {
  for (const demo of extraDemoLocations) {
    const businessGroup = await prisma.businessGroup.upsert({
      where: {
        slug: demo.groupSlug
      },
      update: {
        name: demo.groupName,
        industryType: demo.industryType,
        approvalStatus: ApprovalStatus.APPROVED,
        notes: "Multi-industry Q-App discovery demo"
      },
      create: {
        slug: demo.groupSlug,
        name: demo.groupName,
        industryType: demo.industryType,
        approvalStatus: ApprovalStatus.APPROVED,
        notes: "Multi-industry Q-App discovery demo"
      }
    });

    const businessLocation = await prisma.businessLocation.upsert({
      where: {
        slug: demo.slug
      },
      update: {
        businessGroupId: businessGroup.id,
        name: demo.name,
        status: LocationStatus.LIVE,
        isPublic: true,
        publicDescription: `${demo.name} is live on Q-App with distance-aware discovery and a transparent queue.`,
        phone: "+447400000199",
        email: `${demo.slug}@qapp.demo`,
        timezone: "Europe/London",
        addressLine1: demo.addressLine1,
        city: demo.city,
        postalCode: demo.postalCode,
        countryCode: "GB",
        latitude: demo.latitude,
        longitude: demo.longitude,
        geolocationSource: GeolocationSource.MANUAL_PIN,
        geolocationCapturedAt: new Date(),
        pinConfirmedAt: new Date(),
        queueEnabled: true,
        bookingsEnabled: false,
        queuePaused: false,
        queuePauseReason: null,
        serviceStationsCount: demo.stations,
        defaultWalkInDurationMin: demo.duration,
        nearTurnPositionTrigger: 2,
        nearTurnEtaTriggerMin: 15,
        calledGracePeriodMin: 5,
        onboardingCompletedAt: new Date(),
        approvedAt: new Date(),
        openingHours: {
          monday: "09:00-19:00",
          tuesday: "09:00-19:00",
          wednesday: "09:00-19:00",
          thursday: "09:00-19:00",
          friday: "09:00-20:00",
          saturday: "10:00-18:00",
          sunday: "11:00-16:00"
        }
      },
      create: {
        businessGroupId: businessGroup.id,
        slug: demo.slug,
        name: demo.name,
        status: LocationStatus.LIVE,
        isPublic: true,
        publicDescription: `${demo.name} is live on Q-App with distance-aware discovery and a transparent queue.`,
        phone: "+447400000199",
        email: `${demo.slug}@qapp.demo`,
        timezone: "Europe/London",
        addressLine1: demo.addressLine1,
        city: demo.city,
        postalCode: demo.postalCode,
        countryCode: "GB",
        latitude: demo.latitude,
        longitude: demo.longitude,
        geolocationSource: GeolocationSource.MANUAL_PIN,
        geolocationCapturedAt: new Date(),
        pinConfirmedAt: new Date(),
        queueEnabled: true,
        bookingsEnabled: false,
        queuePaused: false,
        serviceStationsCount: demo.stations,
        defaultWalkInDurationMin: demo.duration,
        nearTurnPositionTrigger: 2,
        nearTurnEtaTriggerMin: 15,
        calledGracePeriodMin: 5,
        onboardingCompletedAt: new Date(),
        approvedAt: new Date(),
        openingHours: {
          monday: "09:00-19:00",
          tuesday: "09:00-19:00",
          wednesday: "09:00-19:00",
          thursday: "09:00-19:00",
          friday: "09:00-20:00",
          saturday: "10:00-18:00",
          sunday: "11:00-16:00"
        }
      }
    });

    await resetLocationData(businessLocation.id);

    const service = await prisma.service.create({
      data: {
        businessLocationId: businessLocation.id,
        name: "Walk-in Service",
        category: demo.industryType.toLowerCase().replaceAll("_", " "),
        description: "Default queueable service for discovery ranking demo",
        defaultDurationMin: demo.duration,
        isQueueable: true,
        isBookable: false,
        isActive: true
      }
    });

    const now = Date.now();
    const minutesAgo = (minutes) => new Date(now - minutes * 60_000);

    for (const [index, queueCustomer] of demo.queue.entries()) {
      const customer = await upsertCustomer({
        firstName: queueCustomer.firstName,
        phone: queueCustomer.phone
      });
      const visit = await prisma.visit.create({
        data: {
          businessLocationId: businessLocation.id,
          customerId: customer.id,
          serviceId: service.id,
          source: VisitSource.REMOTE_QUEUE,
          status: VisitStatus.QUEUED,
          plannedDurationMin: demo.duration,
          estimatedWaitMin: Math.ceil((index * demo.duration) / Math.max(demo.stations, 1)),
          queueJoinedAt: minutesAgo(queueCustomer.minutesAgo)
        }
      });

      await prisma.queueEntry.create({
        data: {
          visitId: visit.id,
          businessLocationId: businessLocation.id,
          trackingToken: `${demo.slug}-queue-${index + 1}`,
          sortIndex: index + 1,
          joinedAt: minutesAgo(queueCustomer.minutesAgo),
          confirmationStatus: ArrivalResponseStatus.PENDING
        }
      });
    }

    for (const [index, review] of demo.reviews.entries()) {
      const customer = await upsertCustomer({
        firstName: review.firstName,
        phone: review.phone
      });
      const visit = await prisma.visit.create({
        data: {
          businessLocationId: businessLocation.id,
          customerId: customer.id,
          serviceId: service.id,
          source: VisitSource.REMOTE_QUEUE,
          status: VisitStatus.COMPLETED,
          plannedDurationMin: demo.duration,
          actualDurationMin: demo.duration,
          estimatedWaitMin: demo.duration,
          queueJoinedAt: minutesAgo(300 + index * 60),
          readyAt: minutesAgo(280 + index * 60),
          startedAt: minutesAgo(275 + index * 60),
          completedAt: minutesAgo(275 + index * 60 - demo.duration)
        }
      });

      await prisma.customerReview.create({
        data: {
          businessLocationId: businessLocation.id,
          visitId: visit.id,
          customerId: customer.id,
          rating: review.rating,
          comment: review.comment,
          isPublic: true
        }
      });
    }
  }
}

async function seedPendingSignup() {
  await prisma.businessSignup.deleteMany({
    where: {
      email: "owner@camdenchair.demo"
    }
  });

  await prisma.businessLocation.deleteMany({
    where: {
      name: "Camden Chair Studio"
    }
  });

  await prisma.businessGroup.deleteMany({
    where: {
      name: "Camden Chair Studio"
    }
  });

  await prisma.businessSignup.create({
    data: {
      approvalStatus: ApprovalStatus.PENDING,
      businessName: "Camden Chair Studio",
      ownerName: "Jordan Miles",
      mobileNumber: "+447400000106",
      email: "owner@camdenchair.demo",
      addressLine1: "88 Parkway",
      city: "London",
      region: "Greater London",
      postalCode: "NW1 7AN",
      countryCode: "GB",
      industryType: IndustryType.SALON,
      serviceStationsCount: 3,
      openingHoursNote: "Mon-Sat 10:00-19:00",
      latitude: 51.5387,
      longitude: -0.1426,
      geolocationSource: GeolocationSource.ADDRESS_GEOCODE,
      geolocationCapturedAt: new Date(),
      pinConfirmedAt: new Date()
    }
  });
}

async function main() {
  const location = await seedDemoBusiness();
  await seedExtraDemoLocations();
  await seedPendingSignup();

  console.log("Q-App demo data seeded.");
  console.log("Demo credentials:");
  console.log("  Platform admin: admin@qapp.demo / QappAdmin123!");
  console.log("  Owner: owner@fadeyard.demo / QappOwner123!");
  console.log("  Manager: manager@fadeyard.demo / QappManager123!");
  console.log("  Staff operator: staff@fadeyard.demo / QappStaff123!");
  console.log(`Shop slug: ${location.slug}`);
  console.log("Queue status routes:");
  console.log("  /queue/demo-queue-amir");
  console.log("  /queue/demo-queue-joel");
  console.log("  /queue/demo-queue-sana");
  console.log("  /queue/demo-queue-liam");
  console.log("Operator route:");
  console.log("  /ops/shops/demo-barber");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
