import { v4 as uuidv4 } from 'uuid';
import { Source, FlowReference } from './types';

export class SourceModel implements Source {
  id: string;
  label?: string;
  description?: string;
  tags: Record<string, string>;
  flows: FlowReference[];
  created: Date;
  updated: Date;

  constructor(data: Partial<Source> = {}) {
    this.id = data.id || uuidv4();
    this.label = data.label;
    this.description = data.description;
    this.tags = data.tags || {};
    this.flows = data.flows || [];
    this.created = data.created || new Date();
    this.updated = data.updated || new Date();
  }

  /**
   * Add a flow reference to the source
   */
  addFlow(flowId: string, role?: string): FlowReference {
    // Check if flow already exists
    const existingFlow = this.flows.find(f => f.flowId === flowId);
    if (existingFlow) {
      // Update role if provided
      if (role !== undefined) {
        existingFlow.role = role;
        this.updated = new Date();
      }
      return existingFlow;
    }

    const flowRef: FlowReference = { flowId, role };
    this.flows.push(flowRef);
    this.updated = new Date();
    
    return flowRef;
  }

  /**
   * Remove a flow reference from the source
   */
  removeFlow(flowId: string): boolean {
    const initialLength = this.flows.length;
    this.flows = this.flows.filter(f => f.flowId !== flowId);
    
    if (this.flows.length < initialLength) {
      this.updated = new Date();
      return true;
    }
    
    return false;
  }

  /**
   * Get flow reference by ID
   */
  getFlow(flowId: string): FlowReference | undefined {
    return this.flows.find(f => f.flowId === flowId);
  }

  /**
   * Get flows by role
   */
  getFlowsByRole(role: string): FlowReference[] {
    return this.flows.filter(f => f.role === role);
  }

  /**
   * Check if source has a specific flow
   */
  hasFlow(flowId: string): boolean {
    return this.flows.some(f => f.flowId === flowId);
  }

  /**
   * Get primary flow (first flow with 'main' role or first flow)
   */
  getPrimaryFlow(): FlowReference | undefined {
    const mainFlow = this.flows.find(f => f.role === 'main');
    return mainFlow || this.flows[0];
  }

  /**
   * Get proxy flows
   */
  getProxyFlows(): FlowReference[] {
    return this.flows.filter(f => f.role === 'proxy');
  }

  /**
   * Clone the source with a new ID
   */
  clone(newId?: string): SourceModel {
    return new SourceModel({
      ...this,
      id: newId || uuidv4(),
      created: new Date(),
      updated: new Date(),
      flows: this.flows.map(f => ({ ...f })),
    });
  }

  /**
   * Merge another source into this one
   */
  merge(other: Source): void {
    // Merge tags
    this.tags = { ...this.tags, ...other.tags };
    
    // Merge flows (avoid duplicates)
    for (const flow of other.flows) {
      if (!this.hasFlow(flow.flowId)) {
        this.flows.push({ ...flow });
      }
    }
    
    // Update metadata
    if (other.label && !this.label) {
      this.label = other.label;
    }
    
    if (other.description && !this.description) {
      this.description = other.description;
    }
    
    this.updated = new Date();
  }

  /**
   * Validate source structure
   */
  validate(): string[] {
    const errors: string[] = [];
    
    if (!this.id) {
      errors.push('Source must have an ID');
    }
    
    if (this.flows.length === 0) {
      errors.push('Source must have at least one flow');
    }
    
    // Check for duplicate flow IDs
    const flowIds = new Set<string>();
    for (const flow of this.flows) {
      if (flowIds.has(flow.flowId)) {
        errors.push(`Duplicate flow ID: ${flow.flowId}`);
      }
      flowIds.add(flow.flowId);
    }
    
    // Check for multiple flows with 'main' role
    const mainFlows = this.getFlowsByRole('main');
    if (mainFlows.length > 1) {
      errors.push('Source cannot have multiple flows with "main" role');
    }
    
    return errors;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Source {
    return {
      id: this.id,
      label: this.label,
      description: this.description,
      tags: this.tags,
      flows: this.flows,
      created: this.created,
      updated: this.updated,
    };
  }
}