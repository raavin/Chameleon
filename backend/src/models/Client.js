import mongoose from 'mongoose';

/**
 * Client Schema - Identity record for a person/entity
 * Maps to the "clients" IndexedDB store
 * 
 * Note: In the current app, submissions are embedded in the client.
 * For MongoDB, we'll use references for better scalability,
 * but maintain backward compatibility in the API response.
 */
const ClientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      if (ret.metadata instanceof Map) {
        ret.metadata = Object.fromEntries(ret.metadata);
      }
      return ret;
    }
  }
});

// Virtual to populate submissions when needed
ClientSchema.virtual('submissions', {
  ref: 'Submission',
  localField: 'id',
  foreignField: 'subject_id'
});

// Index for faster lookups (id already has unique index)
ClientSchema.index({ name: 'text' });

const Client = mongoose.model('Client', ClientSchema);

export default Client;
