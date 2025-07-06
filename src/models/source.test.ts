import { describe, it, expect, beforeEach } from 'vitest';
import { SourceModel } from './source';
import { FlowReference } from './types';

describe('SourceModel', () => {
  let source: SourceModel;

  beforeEach(() => {
    source = new SourceModel({
      label: 'Test Source',
      description: 'A test source',
      tags: { project: 'test' },
    });
  });

  describe('constructor', () => {
    it('should create source with default values', () => {
      const newSource = new SourceModel();
      expect(newSource.id).toBeTruthy();
      expect(newSource.tags).toEqual({});
      expect(newSource.flows).toEqual([]);
      expect(newSource.created).toBeInstanceOf(Date);
      expect(newSource.updated).toBeInstanceOf(Date);
    });

    it('should create source with provided values', () => {
      const flows: FlowReference[] = [
        { flowId: 'flow-1', role: 'main' },
        { flowId: 'flow-2', role: 'proxy' },
      ];

      const newSource = new SourceModel({
        id: 'source-123',
        label: 'My Source',
        description: 'Test description',
        tags: { type: 'video' },
        flows,
      });

      expect(newSource.id).toBe('source-123');
      expect(newSource.label).toBe('My Source');
      expect(newSource.description).toBe('Test description');
      expect(newSource.tags).toEqual({ type: 'video' });
      expect(newSource.flows).toEqual(flows);
    });
  });

  describe('addFlow', () => {
    it('should add a new flow reference', () => {
      const flowRef = source.addFlow('flow-123', 'main');
      
      expect(flowRef).toEqual({ flowId: 'flow-123', role: 'main' });
      expect(source.flows).toHaveLength(1);
      expect(source.flows[0]).toEqual(flowRef);
    });

    it('should add flow without role', () => {
      const flowRef = source.addFlow('flow-123');
      
      expect(flowRef).toEqual({ flowId: 'flow-123', role: undefined });
    });

    it('should update role for existing flow', () => {
      source.addFlow('flow-123', 'main');
      const updated = source.addFlow('flow-123', 'proxy');
      
      expect(source.flows).toHaveLength(1);
      expect(updated.role).toBe('proxy');
      expect(source.flows[0].role).toBe('proxy');
    });

    it('should not duplicate flows', () => {
      source.addFlow('flow-123', 'main');
      source.addFlow('flow-123', 'main');
      
      expect(source.flows).toHaveLength(1);
    });
  });

  describe('removeFlow', () => {
    beforeEach(() => {
      source.addFlow('flow-1', 'main');
      source.addFlow('flow-2', 'proxy');
      source.addFlow('flow-3', 'thumbnail');
    });

    it('should remove flow by ID', () => {
      const removed = source.removeFlow('flow-2');
      
      expect(removed).toBe(true);
      expect(source.flows).toHaveLength(2);
      expect(source.hasFlow('flow-2')).toBe(false);
    });

    it('should return false for non-existent flow', () => {
      const removed = source.removeFlow('flow-999');
      
      expect(removed).toBe(false);
      expect(source.flows).toHaveLength(3);
    });
  });

  describe('getFlow', () => {
    beforeEach(() => {
      source.addFlow('flow-1', 'main');
      source.addFlow('flow-2', 'proxy');
    });

    it('should get flow by ID', () => {
      const flow = source.getFlow('flow-1');
      expect(flow).toEqual({ flowId: 'flow-1', role: 'main' });
    });

    it('should return undefined for non-existent flow', () => {
      const flow = source.getFlow('flow-999');
      expect(flow).toBeUndefined();
    });
  });

  describe('getFlowsByRole', () => {
    beforeEach(() => {
      source.addFlow('flow-1', 'main');
      source.addFlow('flow-2', 'proxy');
      source.addFlow('flow-3', 'proxy');
      source.addFlow('flow-4', 'thumbnail');
    });

    it('should get flows by role', () => {
      const proxyFlows = source.getFlowsByRole('proxy');
      expect(proxyFlows).toHaveLength(2);
      expect(proxyFlows[0].flowId).toBe('flow-2');
      expect(proxyFlows[1].flowId).toBe('flow-3');
    });

    it('should return empty array for non-existent role', () => {
      const flows = source.getFlowsByRole('non-existent');
      expect(flows).toEqual([]);
    });
  });

  describe('getPrimaryFlow', () => {
    it('should return main flow when available', () => {
      source.addFlow('flow-1', 'proxy');
      source.addFlow('flow-2', 'main');
      source.addFlow('flow-3', 'thumbnail');
      
      const primary = source.getPrimaryFlow();
      expect(primary).toEqual({ flowId: 'flow-2', role: 'main' });
    });

    it('should return first flow when no main flow', () => {
      source.addFlow('flow-1', 'proxy');
      source.addFlow('flow-2', 'thumbnail');
      
      const primary = source.getPrimaryFlow();
      expect(primary).toEqual({ flowId: 'flow-1', role: 'proxy' });
    });

    it('should return undefined for empty source', () => {
      const primary = source.getPrimaryFlow();
      expect(primary).toBeUndefined();
    });
  });

  describe('getProxyFlows', () => {
    it('should return all proxy flows', () => {
      source.addFlow('flow-1', 'main');
      source.addFlow('flow-2', 'proxy');
      source.addFlow('flow-3', 'proxy');
      source.addFlow('flow-4', 'thumbnail');
      
      const proxies = source.getProxyFlows();
      expect(proxies).toHaveLength(2);
      expect(proxies.map(f => f.flowId)).toEqual(['flow-2', 'flow-3']);
    });
  });

  describe('clone', () => {
    it('should create a deep copy with new ID', () => {
      source.addFlow('flow-1', 'main');
      source.addFlow('flow-2', 'proxy');
      
      const cloned = source.clone();
      
      expect(cloned.id).not.toBe(source.id);
      expect(cloned.label).toBe(source.label);
      expect(cloned.description).toBe(source.description);
      expect(cloned.tags).toEqual(source.tags);
      expect(cloned.flows).toEqual(source.flows);
      expect(cloned.flows).not.toBe(source.flows); // Different array reference
    });

    it('should use provided ID when cloning', () => {
      const cloned = source.clone('custom-id');
      expect(cloned.id).toBe('custom-id');
    });
  });

  describe('merge', () => {
    it('should merge tags and flows', () => {
      source.tags = { project: 'test', version: '1' };
      source.addFlow('flow-1', 'main');
      
      const other = new SourceModel({
        tags: { version: '2', type: 'video' },
        flows: [
          { flowId: 'flow-2', role: 'proxy' },
          { flowId: 'flow-3', role: 'thumbnail' },
        ],
      });
      
      source.merge(other);
      
      expect(source.tags).toEqual({
        project: 'test',
        version: '2', // Overwritten
        type: 'video', // New
      });
      expect(source.flows).toHaveLength(3);
    });

    it('should not duplicate flows when merging', () => {
      source.addFlow('flow-1', 'main');
      
      const other = new SourceModel({
        flows: [
          { flowId: 'flow-1', role: 'proxy' }, // Same ID, different role
          { flowId: 'flow-2', role: 'thumbnail' },
        ],
      });
      
      source.merge(other);
      
      expect(source.flows).toHaveLength(2);
      expect(source.getFlow('flow-1')?.role).toBe('main'); // Original role preserved
    });

    it('should merge metadata when missing', () => {
      source.label = undefined;
      source.description = undefined;
      
      const other = new SourceModel({
        label: 'Other Label',
        description: 'Other Description',
      });
      
      source.merge(other);
      
      expect(source.label).toBe('Other Label');
      expect(source.description).toBe('Other Description');
    });
  });

  describe('validate', () => {
    it('should validate valid source', () => {
      source.addFlow('flow-1', 'main');
      
      const errors = source.validate();
      expect(errors).toEqual([]);
    });

    it('should report missing ID', () => {
      source.id = '';
      source.addFlow('flow-1', 'main');
      
      const errors = source.validate();
      expect(errors).toContain('Source must have an ID');
    });

    it('should report missing flows', () => {
      const errors = source.validate();
      expect(errors).toContain('Source must have at least one flow');
    });

    it('should report duplicate flow IDs', () => {
      source.flows = [
        { flowId: 'flow-1', role: 'main' },
        { flowId: 'flow-1', role: 'proxy' },
      ];
      
      const errors = source.validate();
      expect(errors).toContain('Duplicate flow ID: flow-1');
    });

    it('should report multiple main flows', () => {
      source.addFlow('flow-1', 'main');
      source.addFlow('flow-2', 'main');
      
      const errors = source.validate();
      expect(errors).toContain('Source cannot have multiple flows with "main" role');
    });
  });

  describe('toJSON', () => {
    it('should convert to plain object', () => {
      source.addFlow('flow-1', 'main');
      
      const json = source.toJSON();
      
      expect(json).toEqual({
        id: source.id,
        label: source.label,
        description: source.description,
        tags: source.tags,
        flows: source.flows,
        created: source.created,
        updated: source.updated,
      });
      
      // Verify it's a plain object
      expect(json.constructor).toBe(Object);
    });
  });
});