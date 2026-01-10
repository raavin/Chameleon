import mongoose from 'mongoose';

/**
 * Submission Schema - A completed form submission
 * Maps to the "submissions" IndexedDB store
 * 
 * Each submission is linked to:
 * - A manifest (via manifest_id)
 * - A domain within that manifest (via domain_id)
 * - A client/subject (via subject_id)
 */
const SubmissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  manifest_id: { type: String, required: true },
  domain_id: { type: String, required: true },
  subject_id: { type: String, required: true },  // Links to Client.id
  data: {                                         // The actual form data
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['FINALIZED', 'PENDING', 'FLAGGED'],
    default: 'PENDING'
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      if (ret.data instanceof Map) {
        ret.data = Object.fromEntries(ret.data);
      }
      return ret;
    }
  }
});

// Indexes for common queries (id already has unique index)
SubmissionSchema.index({ subject_id: 1 });
SubmissionSchema.index({ manifest_id: 1 });
SubmissionSchema.index({ timestamp: -1 });

const Submission = mongoose.model('Submission', SubmissionSchema);

export default Submission;
