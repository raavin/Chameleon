import mongoose from 'mongoose';

const AgentImprovementSchema = new mongoose.Schema(
  {
    run_id: { type: String, required: true, index: true },
    manifest_id: { type: String },
    stage: { type: String, default: 'improvement' },
    prompt: { type: String },
    response_text: { type: String },
    parsed: { type: mongoose.Schema.Types.Mixed },
    notes: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('AgentImprovement', AgentImprovementSchema);
