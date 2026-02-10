/**
 * Module Manifest Schemas - Chameleon Protocol
 * 
 * Defines the structure for 5+ core application modules:
 * 1. User Management
 * 2. Client/Entity Management
 * 3. Data Collection (existing forms)
 * 4. Data Views & Dashboards
 * 5. Communications
 * 6. Notes & Documentation
 * 7. Calendar & Scheduling
 */

export const MODULE_TYPES = {
  USER_MANAGEMENT: 'user-management',
  CLIENT_ENTITY: 'client-entity',
  DATA_COLLECTION: 'data-collection',
  DATA_VIEWS: 'data-views',
  COMMUNICATIONS: 'communications',
  NOTES: 'notes',
  CALENDAR: 'calendar',
  TASKS: 'tasks',
  WORKFLOW: 'workflow',
  REPORTING: 'reporting'
};

export const UserManagementModuleSchema = {
  type: MODULE_TYPES.USER_MANAGEMENT,
  version: '1.0.0',
  metadata: {
    title: 'User Management',
    description: 'Authentication, authorization, and user profile management',
    icon: 'users',
    color: '#3B82F6'
  },
  features: {
    authentication: {
      enabled: true,
      methods: ['email', 'oauth'],
      mfa: false
    },
    authorization: {
      enabled: true,
      rbac: true,
      roles: [
        { id: 'admin', name: 'Administrator', permissions: ['*'] },
        { id: 'manager', name: 'Manager', permissions: ['read', 'write', 'approve'] },
        { id: 'staff', name: 'Staff', permissions: ['read', 'write'] },
        { id: 'viewer', name: 'Viewer', permissions: ['read'] }
      ]
    },
    profiles: {
      enabled: true,
      fields: [
        { id: 'firstName', label: 'First Name', type: 'text', required: true },
        { id: 'lastName', label: 'Last Name', type: 'text', required: true },
        { id: 'email', label: 'Email', type: 'email', required: true, unique: true },
        { id: 'phone', label: 'Phone', type: 'tel', required: false },
        { id: 'department', label: 'Department', type: 'select', options: [] },
        { id: 'avatar', label: 'Avatar', type: 'image', required: false }
      ]
    },
    activityLog: {
      enabled: true,
      retention: '90 days'
    }
  },
  database: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'email', type: 'varchar(255)', unique: true, notNull: true },
          { name: 'password_hash', type: 'varchar(255)', notNull: true },
          { name: 'first_name', type: 'varchar(100)' },
          { name: 'last_name', type: 'varchar(100)' },
          { name: 'phone', type: 'varchar(20)' },
          { name: 'department', type: 'varchar(100)' },
          { name: 'avatar_url', type: 'text' },
          { name: 'role_id', type: 'varchar(50)', notNull: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'last_login', type: 'timestamp' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['email'], unique: true },
          { columns: ['role_id'] }
        ]
      },
      {
        name: 'user_sessions',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'user_id', type: 'uuid', notNull: true, foreignKey: 'users.id' },
          { name: 'token', type: 'varchar(255)', unique: true },
          { name: 'expires_at', type: 'timestamp', notNull: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ]
      },
      {
        name: 'user_activity_log',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'user_id', type: 'uuid', notNull: true, foreignKey: 'users.id' },
          { name: 'action', type: 'varchar(100)', notNull: true },
          { name: 'entity_type', type: 'varchar(100)' },
          { name: 'entity_id', type: 'varchar(255)' },
          { name: 'metadata', type: 'jsonb' },
          { name: 'ip_address', type: 'varchar(45)' },
          { name: 'user_agent', type: 'text' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['user_id', 'created_at'] },
          { columns: ['entity_type', 'entity_id'] }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'POST', path: '/auth/register', description: 'Register new user' },
      { method: 'POST', path: '/auth/login', description: 'Login user' },
      { method: 'POST', path: '/auth/logout', description: 'Logout user' },
      { method: 'GET', path: '/users', description: 'List users', auth: true },
      { method: 'GET', path: '/users/:id', description: 'Get user by ID', auth: true },
      { method: 'PUT', path: '/users/:id', description: 'Update user', auth: true },
      { method: 'DELETE', path: '/users/:id', description: 'Delete user', auth: true },
      { method: 'GET', path: '/users/:id/activity', description: 'Get user activity log', auth: true }
    ]
  }
};

export const ClientEntityModuleSchema = {
  type: MODULE_TYPES.CLIENT_ENTITY,
  version: '1.0.0',
  metadata: {
    title: 'Client & Entity Management',
    description: 'Polymorphic client/entity profiles with relationship management',
    icon: 'briefcase',
    color: '#10B981'
  },
  features: {
    polymorphicEntities: {
      enabled: true,
      types: [
        { id: 'individual', name: 'Individual', icon: 'user' },
        { id: 'family', name: 'Family', icon: 'users' },
        { id: 'organization', name: 'Organization', icon: 'building' },
        { id: 'custom', name: 'Custom', icon: 'star' }
      ]
    },
    relationships: {
      enabled: true,
      types: [
        { id: 'parent-child', name: 'Parent-Child' },
        { id: 'spouse', name: 'Spouse' },
        { id: 'guardian', name: 'Guardian' },
        { id: 'employee', name: 'Employee' },
        { id: 'member', name: 'Member' },
        { id: 'custom', name: 'Custom' }
      ]
    },
    documents: {
      enabled: true,
      types: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      maxSize: '10MB'
    },
    history: {
      enabled: true,
      trackChanges: true
    }
  },
  database: {
    tables: [
      {
        name: 'clients',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'entity_type', type: 'varchar(50)', notNull: true },
          { name: 'status', type: 'varchar(50)', default: 'active' },
          { name: 'primary_contact_name', type: 'varchar(255)' },
          { name: 'primary_contact_email', type: 'varchar(255)' },
          { name: 'primary_contact_phone', type: 'varchar(20)' },
          { name: 'address_line1', type: 'varchar(255)' },
          { name: 'address_line2', type: 'varchar(255)' },
          { name: 'city', type: 'varchar(100)' },
          { name: 'state', type: 'varchar(100)' },
          { name: 'postal_code', type: 'varchar(20)' },
          { name: 'country', type: 'varchar(100)' },
          { name: 'custom_fields', type: 'jsonb' },
          { name: 'tags', type: 'text[]' },
          { name: 'assigned_to_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'created_by_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['entity_type'] },
          { columns: ['status'] },
          { columns: ['assigned_to_user_id'] },
          { columns: ['created_at'] }
        ]
      },
      {
        name: 'client_relationships',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'client_id_a', type: 'uuid', notNull: true, foreignKey: 'clients.id' },
          { name: 'client_id_b', type: 'uuid', notNull: true, foreignKey: 'clients.id' },
          { name: 'relationship_type', type: 'varchar(50)', notNull: true },
          { name: 'metadata', type: 'jsonb' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['client_id_a'] },
          { columns: ['client_id_b'] }
        ]
      },
      {
        name: 'client_documents',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'client_id', type: 'uuid', notNull: true, foreignKey: 'clients.id' },
          { name: 'filename', type: 'varchar(255)', notNull: true },
          { name: 'file_type', type: 'varchar(50)' },
          { name: 'file_size', type: 'integer' },
          { name: 'storage_url', type: 'text', notNull: true },
          { name: 'uploaded_by_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['client_id'] }
        ]
      },
      {
        name: 'client_history',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'client_id', type: 'uuid', notNull: true, foreignKey: 'clients.id' },
          { name: 'changed_by_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'change_type', type: 'varchar(50)', notNull: true },
          { name: 'field_name', type: 'varchar(100)' },
          { name: 'old_value', type: 'text' },
          { name: 'new_value', type: 'text' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['client_id', 'created_at'] }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'GET', path: '/clients', description: 'List clients', auth: true },
      { method: 'POST', path: '/clients', description: 'Create client', auth: true },
      { method: 'GET', path: '/clients/:id', description: 'Get client by ID', auth: true },
      { method: 'PUT', path: '/clients/:id', description: 'Update client', auth: true },
      { method: 'DELETE', path: '/clients/:id', description: 'Delete client', auth: true },
      { method: 'GET', path: '/clients/:id/relationships', description: 'Get client relationships', auth: true },
      { method: 'POST', path: '/clients/:id/relationships', description: 'Create relationship', auth: true },
      { method: 'GET', path: '/clients/:id/documents', description: 'Get client documents', auth: true },
      { method: 'POST', path: '/clients/:id/documents', description: 'Upload document', auth: true },
      { method: 'GET', path: '/clients/:id/history', description: 'Get client history', auth: true }
    ]
  }
};

export const DataCollectionModuleSchema = {
  type: MODULE_TYPES.DATA_COLLECTION,
  version: '1.0.0',
  metadata: {
    title: 'Data Collection',
    description: 'Dynamic forms with validation, conditional logic, and offline support',
    icon: 'clipboard-list',
    color: '#F59E0B'
  },
  features: {
    dynamicForms: {
      enabled: true,
      manifestBased: true
    },
    validation: {
      enabled: true,
      types: ['required', 'pattern', 'min', 'max', 'custom']
    },
    conditionalLogic: {
      enabled: true,
      showHideFields: true,
      requiredIf: true
    },
    offlineSupport: {
      enabled: true,
      syncOnReconnect: true
    },
    drafts: {
      enabled: true,
      autoSave: true,
      autoSaveInterval: 30000
    }
  },
  database: {
    tables: [
      {
        name: 'form_submissions',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'manifest_id', type: 'uuid', notNull: true },
          { name: 'client_id', type: 'uuid', foreignKey: 'clients.id' },
          { name: 'submitted_by_user_id', type: 'uuid', notNull: true, foreignKey: 'users.id' },
          { name: 'status', type: 'varchar(50)', default: 'draft' },
          { name: 'data', type: 'jsonb', notNull: true },
          { name: 'validation_errors', type: 'jsonb' },
          { name: 'submitted_at', type: 'timestamp' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['manifest_id'] },
          { columns: ['client_id'] },
          { columns: ['submitted_by_user_id'] },
          { columns: ['status'] },
          { columns: ['created_at'] }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'GET', path: '/forms', description: 'List available forms', auth: true },
      { method: 'GET', path: '/forms/:manifestId', description: 'Get form manifest', auth: true },
      { method: 'POST', path: '/submissions', description: 'Create submission', auth: true },
      { method: 'GET', path: '/submissions/:id', description: 'Get submission', auth: true },
      { method: 'PUT', path: '/submissions/:id', description: 'Update submission', auth: true },
      { method: 'POST', path: '/submissions/:id/submit', description: 'Submit draft', auth: true },
      { method: 'GET', path: '/submissions', description: 'List submissions', auth: true }
    ]
  }
};

export const DataViewsModuleSchema = {
  type: MODULE_TYPES.DATA_VIEWS,
  version: '1.0.0',
  metadata: {
    title: 'Data Views & Dashboards',
    description: 'Dashboards, reports, charts, and data visualization',
    icon: 'chart-bar',
    color: '#8B5CF6'
  },
  features: {
    dashboards: {
      enabled: true,
      customizable: true,
      widgets: ['chart', 'table', 'metric', 'list']
    },
    charts: {
      enabled: true,
      types: ['bar', 'line', 'pie', 'doughnut', 'area']
    },
    filtering: {
      enabled: true,
      dateRange: true,
      customFilters: true
    },
    export: {
      enabled: true,
      formats: ['csv', 'xlsx', 'pdf']
    }
  },
  database: {
    tables: [
      {
        name: 'dashboards',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'name', type: 'varchar(255)', notNull: true },
          { name: 'description', type: 'text' },
          { name: 'layout', type: 'jsonb', notNull: true },
          { name: 'filters', type: 'jsonb' },
          { name: 'is_public', type: 'boolean', default: false },
          { name: 'created_by_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'GET', path: '/dashboards', description: 'List dashboards', auth: true },
      { method: 'POST', path: '/dashboards', description: 'Create dashboard', auth: true },
      { method: 'GET', path: '/dashboards/:id', description: 'Get dashboard', auth: true },
      { method: 'PUT', path: '/dashboards/:id', description: 'Update dashboard', auth: true },
      { method: 'GET', path: '/reports/:type', description: 'Generate report', auth: true },
      { method: 'POST', path: '/exports', description: 'Export data', auth: true }
    ]
  }
};

export const CommunicationsModuleSchema = {
  type: MODULE_TYPES.COMMUNICATIONS,
  version: '1.0.0',
  metadata: {
    title: 'Communications',
    description: 'In-app messaging, email, SMS, and activity feed',
    icon: 'chat',
    color: '#EC4899'
  },
  features: {
    inAppMessaging: {
      enabled: true,
      realTime: true,
      attachments: true
    },
    email: {
      enabled: true,
      templates: true
    },
    sms: {
      enabled: false,
      provider: null
    },
    activityFeed: {
      enabled: true,
      realTime: true
    }
  },
  database: {
    tables: [
      {
        name: 'messages',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'from_user_id', type: 'uuid', notNull: true, foreignKey: 'users.id' },
          { name: 'to_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'client_id', type: 'uuid', foreignKey: 'clients.id' },
          { name: 'subject', type: 'varchar(255)' },
          { name: 'body', type: 'text', notNull: true },
          { name: 'message_type', type: 'varchar(50)', default: 'internal' },
          { name: 'is_read', type: 'boolean', default: false },
          { name: 'read_at', type: 'timestamp' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['from_user_id'] },
          { columns: ['to_user_id'] },
          { columns: ['client_id'] },
          { columns: ['created_at'] }
        ]
      },
      {
        name: 'activity_feed',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'client_id', type: 'uuid', foreignKey: 'clients.id' },
          { name: 'activity_type', type: 'varchar(100)', notNull: true },
          { name: 'description', type: 'text', notNull: true },
          { name: 'metadata', type: 'jsonb' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['user_id', 'created_at'] },
          { columns: ['client_id', 'created_at'] }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'GET', path: '/messages', description: 'List messages', auth: true },
      { method: 'POST', path: '/messages', description: 'Send message', auth: true },
      { method: 'GET', path: '/messages/:id', description: 'Get message', auth: true },
      { method: 'PUT', path: '/messages/:id/read', description: 'Mark as read', auth: true },
      { method: 'GET', path: '/activity', description: 'Get activity feed', auth: true }
    ]
  }
};

export const NotesModuleSchema = {
  type: MODULE_TYPES.NOTES,
  version: '1.0.0',
  metadata: {
    title: 'Notes & Documentation',
    description: 'Case notes, rich text editor, attachments, version history',
    icon: 'document-text',
    color: '#6366F1'
  },
  features: {
    richTextEditor: {
      enabled: true,
      formatting: true,
      mentions: true
    },
    attachments: {
      enabled: true,
      types: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      maxSize: '10MB'
    },
    versionHistory: {
      enabled: true,
      retention: '1 year'
    },
    tagging: {
      enabled: true,
      customTags: true
    },
    search: {
      enabled: true,
      fullText: true
    }
  },
  database: {
    tables: [
      {
        name: 'notes',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'client_id', type: 'uuid', foreignKey: 'clients.id' },
          { name: 'title', type: 'varchar(255)', notNull: true },
          { name: 'content', type: 'text', notNull: true },
          { name: 'tags', type: 'text[]' },
          { name: 'is_pinned', type: 'boolean', default: false },
          { name: 'created_by_user_id', type: 'uuid', notNull: true, foreignKey: 'users.id' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['client_id'] },
          { columns: ['created_by_user_id'] },
          { columns: ['created_at'] }
        ]
      },
      {
        name: 'note_versions',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'note_id', type: 'uuid', notNull: true, foreignKey: 'notes.id' },
          { name: 'content', type: 'text', notNull: true },
          { name: 'changed_by_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'created_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['note_id', 'created_at'] }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'GET', path: '/notes', description: 'List notes', auth: true },
      { method: 'POST', path: '/notes', description: 'Create note', auth: true },
      { method: 'GET', path: '/notes/:id', description: 'Get note', auth: true },
      { method: 'PUT', path: '/notes/:id', description: 'Update note', auth: true },
      { method: 'DELETE', path: '/notes/:id', description: 'Delete note', auth: true },
      { method: 'GET', path: '/notes/:id/versions', description: 'Get note versions', auth: true },
      { method: 'GET', path: '/notes/search', description: 'Search notes', auth: true }
    ]
  }
};

export const CalendarModuleSchema = {
  type: MODULE_TYPES.CALENDAR,
  version: '1.0.0',
  metadata: {
    title: 'Calendar & Scheduling',
    description: 'Appointments, reminders, recurring events, calendar views',
    icon: 'calendar',
    color: '#14B8A6'
  },
  features: {
    appointments: {
      enabled: true,
      types: ['meeting', 'call', 'visit', 'deadline', 'custom']
    },
    reminders: {
      enabled: true,
      methods: ['email', 'in-app'],
      advanceNotice: [15, 30, 60, 1440]
    },
    recurringEvents: {
      enabled: true,
      patterns: ['daily', 'weekly', 'monthly', 'yearly', 'custom']
    },
    views: {
      enabled: true,
      types: ['day', 'week', 'month', 'agenda']
    }
  },
  database: {
    tables: [
      {
        name: 'calendar_events',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'title', type: 'varchar(255)', notNull: true },
          { name: 'description', type: 'text' },
          { name: 'event_type', type: 'varchar(50)', notNull: true },
          { name: 'start_time', type: 'timestamp', notNull: true },
          { name: 'end_time', type: 'timestamp', notNull: true },
          { name: 'all_day', type: 'boolean', default: false },
          { name: 'location', type: 'varchar(255)' },
          { name: 'client_id', type: 'uuid', foreignKey: 'clients.id' },
          { name: 'assigned_to_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'recurrence_rule', type: 'varchar(255)' },
          { name: 'recurrence_parent_id', type: 'uuid', foreignKey: 'calendar_events.id' },
          { name: 'reminder_minutes', type: 'integer[]' },
          { name: 'status', type: 'varchar(50)', default: 'scheduled' },
          { name: 'created_by_user_id', type: 'uuid', foreignKey: 'users.id' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { columns: ['start_time'] },
          { columns: ['client_id'] },
          { columns: ['assigned_to_user_id'] },
          { columns: ['status'] }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { method: 'GET', path: '/calendar/events', description: 'List events', auth: true },
      { method: 'POST', path: '/calendar/events', description: 'Create event', auth: true },
      { method: 'GET', path: '/calendar/events/:id', description: 'Get event', auth: true },
      { method: 'PUT', path: '/calendar/events/:id', description: 'Update event', auth: true },
      { method: 'DELETE', path: '/calendar/events/:id', description: 'Delete event', auth: true },
      { method: 'GET', path: '/calendar/availability', description: 'Check availability', auth: true }
    ]
  }
};

export const ALL_MODULE_SCHEMAS = {
  [MODULE_TYPES.USER_MANAGEMENT]: UserManagementModuleSchema,
  [MODULE_TYPES.CLIENT_ENTITY]: ClientEntityModuleSchema,
  [MODULE_TYPES.DATA_COLLECTION]: DataCollectionModuleSchema,
  [MODULE_TYPES.DATA_VIEWS]: DataViewsModuleSchema,
  [MODULE_TYPES.COMMUNICATIONS]: CommunicationsModuleSchema,
  [MODULE_TYPES.NOTES]: NotesModuleSchema,
  [MODULE_TYPES.CALENDAR]: CalendarModuleSchema
};

export function getModuleSchema(moduleType) {
  return ALL_MODULE_SCHEMAS[moduleType] || null;
}

export function getAllModuleSchemas() {
  return Object.values(ALL_MODULE_SCHEMAS);
}
