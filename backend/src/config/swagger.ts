import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TouchCare Benefits API',
      version: '1.0.0',
      description: 'Employee Benefits Decision Support Platform API',
      contact: {
        name: 'TouchCare Development Team',
        email: 'dev@touchcare.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        sessionToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-Token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            companyId: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['admin', 'employee'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['HDHP', 'PPO', 'HMO', 'EPO'] },
            network: { type: 'string' },
            premiums: {
              type: 'object',
              properties: {
                employee: { type: 'number' },
                employee_spouse: { type: 'number' },
                employee_children: { type: 'number' },
                family: { type: 'number' },
              },
            },
            deductibles: {
              type: 'object',
              properties: {
                individual: { type: 'number' },
                family: { type: 'number' },
              },
            },
            oop_max: {
              type: 'object',
              properties: {
                individual: { type: 'number' },
                family: { type: 'number' },
              },
            },
            coinsurance: { type: 'number' },
            hsa_eligible: { type: 'boolean' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sessionToken: { type: 'string' },
            mode: { type: 'string', enum: ['counselor', 'go'] },
            currentStep: { type: 'integer' },
            profileData: { type: 'object' },
            selectedPlanId: { type: 'string', format: 'uuid' },
            startedAt: { type: 'string', format: 'date-time' },
          },
        },
        Recommendation: {
          type: 'object',
          properties: {
            planId: { type: 'string', format: 'uuid' },
            plan: { $ref: '#/components/schemas/Plan' },
            fitCategory: { type: 'string', enum: ['best', 'good', 'not_recommended'] },
            typicalYear: {
              type: 'object',
              properties: {
                premium: { type: 'number' },
                deductible: { type: 'number' },
                copays: { type: 'number' },
                prescriptions: { type: 'number' },
                total: { type: 'number' },
                hsaSavings: { type: 'number' },
                netCost: { type: 'number' },
              },
            },
            worstCase: { type: 'object' },
            reasonsFor: { type: 'array', items: { type: 'string' } },
            reasonsAgainst: { type: 'array', items: { type: 'string' } },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            context: {
              type: 'object',
              properties: {
                currentStep: { type: 'integer' },
                selectedPlanId: { type: 'string' },
              },
            },
          },
        },
        ChatResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            suggestedQuestions: { type: 'array', items: { type: 'string' } },
            needsEscalation: { type: 'boolean' },
            sources: { type: 'array', items: { type: 'object' } },
          },
        },
        AnalyticsEvent: {
          type: 'object',
          properties: {
            eventType: { type: 'string' },
            eventData: { type: 'object' },
            page: { type: 'string' },
            step: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Sessions', description: 'Enrollment session management' },
      { name: 'Plans', description: 'Health plan operations' },
      { name: 'Recommendations', description: 'Plan recommendations' },
      { name: 'Prescriptions', description: 'Prescription drug lookup' },
      { name: 'Chat', description: 'AI chatbot' },
      { name: 'Analytics', description: 'Analytics and A/B testing' },
      { name: 'Admin', description: 'Admin-only endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerDocs = `
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, companyId]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               companyId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 *
 * /sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Create enrollment session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, mode]
 *             properties:
 *               companyId: { type: string, format: uuid }
 *               mode: { type: string, enum: [counselor, go] }
 *               language: { type: string, enum: [en, es] }
 *               enrollmentType: { type: string, enum: [open_enrollment, new_hire, life_event] }
 *     responses:
 *       201:
 *         description: Session created
 *
 * /sessions/{id}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get session by ID
 *     security:
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session data
 *       404:
 *         description: Session not found
 *
 *   put:
 *     tags: [Sessions]
 *     summary: Update session
 *     security:
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentStep: { type: integer }
 *               profileData: { type: object }
 *               selectedPlanId: { type: string }
 *     responses:
 *       200:
 *         description: Session updated
 *
 * /plans:
 *   get:
 *     tags: [Plans]
 *     summary: List available plans
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [HDHP, PPO, HMO, EPO] }
 *       - in: query
 *         name: hsaEligible
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of plans
 *
 * /recommendations:
 *   post:
 *     tags: [Recommendations]
 *     summary: Generate plan recommendations
 *     security:
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile: { type: object }
 *     responses:
 *       200:
 *         description: Recommendations generated
 *
 * /prescriptions/search:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Search prescription drugs
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *     responses:
 *       200:
 *         description: Search results
 *
 * /prescriptions/{id}/alternatives:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Find lower-cost alternatives
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Alternative drugs
 *
 * /chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send message to AI chatbot
 *     security:
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *     responses:
 *       200:
 *         description: Chat response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *
 * /analytics/events:
 *   post:
 *     tags: [Analytics]
 *     summary: Track analytics event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyticsEvent'
 *     responses:
 *       201:
 *         description: Event tracked
 *
 * /analytics/funnel:
 *   get:
 *     tags: [Analytics]
 *     summary: Get funnel metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funnel data
 *
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *       403:
 *         description: Admin access required
 */
`;
