import { ChildWorkflowIds } from "../utils/childWorkflowIds";

describe("ChildWorkflowIds", () => {
  describe("forEach", () => {
    it("should generate correct forEach child workflow ID", () => {
      const id = ChildWorkflowIds.forEach("parent-123", "for_each_users", 0);
      expect(id).toBe("parent-123-forEach-for_each_users-0");
    });

    it("should generate unique IDs for different indices", () => {
      const id0 = ChildWorkflowIds.forEach("parent-123", "my_node", 0);
      const id1 = ChildWorkflowIds.forEach("parent-123", "my_node", 1);
      const id2 = ChildWorkflowIds.forEach("parent-123", "my_node", 2);

      expect(id0).not.toBe(id1);
      expect(id1).not.toBe(id2);
      expect(id0).toBe("parent-123-forEach-my_node-0");
      expect(id1).toBe("parent-123-forEach-my_node-1");
      expect(id2).toBe("parent-123-forEach-my_node-2");
    });

    it("should generate unique IDs for different node IDs", () => {
      const idA = ChildWorkflowIds.forEach("parent-123", "node_a", 0);
      const idB = ChildWorkflowIds.forEach("parent-123", "node_b", 0);

      expect(idA).not.toBe(idB);
    });
  });

  describe("parseForEach", () => {
    it("should parse a valid forEach child workflow ID", () => {
      const parsed = ChildWorkflowIds.parseForEach(
        "parent-123-forEach-for_each_users-5",
      );
      expect(parsed).toEqual({
        parentWorkflowId: "parent-123",
        nodeId: "for_each_users",
        index: 5,
      });
    });

    it("should parse index 0 correctly", () => {
      const parsed = ChildWorkflowIds.parseForEach(
        "wf-abc-forEach-my_node-0",
      );
      expect(parsed).toEqual({
        parentWorkflowId: "wf-abc",
        nodeId: "my_node",
        index: 0,
      });
    });

    it("should return null for non-forEach IDs", () => {
      expect(ChildWorkflowIds.parseForEach("parent-123-row-5")).toBeNull();
      expect(ChildWorkflowIds.parseForEach("adk-parent-123-node")).toBeNull();
      expect(ChildWorkflowIds.parseForEach("random-string")).toBeNull();
    });

    it("should roundtrip: generate then parse", () => {
      const parentId = "workflow-uuid-123";
      const nodeId = "for_each_items";
      const index = 42;

      const generated = ChildWorkflowIds.forEach(parentId, nodeId, index);
      const parsed = ChildWorkflowIds.parseForEach(generated);

      expect(parsed).toEqual({
        parentWorkflowId: parentId,
        nodeId: nodeId,
        index: index,
      });
    });
  });

  describe("isForEachWorkflow", () => {
    it("should return true for forEach child workflow IDs", () => {
      expect(
        ChildWorkflowIds.isForEachWorkflow(
          "parent-123-forEach-my_node-0",
        ),
      ).toBe(true);
      expect(
        ChildWorkflowIds.isForEachWorkflow(
          "wf-abc-forEach-for_each_users-99",
        ),
      ).toBe(true);
    });

    it("should return false for iterator child workflow IDs", () => {
      expect(
        ChildWorkflowIds.isForEachWorkflow("parent-123-row-0"),
      ).toBe(false);
    });

    it("should return false for ADK child workflow IDs", () => {
      expect(
        ChildWorkflowIds.isForEachWorkflow("adk-parent-123-node"),
      ).toBe(false);
    });

    it("should return false for plain workflow IDs", () => {
      expect(ChildWorkflowIds.isForEachWorkflow("some-workflow-id")).toBe(
        false,
      );
    });
  });

  describe("getType", () => {
    it("should return 'forEach' for forEach child workflow IDs", () => {
      expect(
        ChildWorkflowIds.getType("parent-forEach-node_a-0"),
      ).toBe("forEach");
    });

    it("should return 'iterator' for iterator child workflow IDs", () => {
      expect(ChildWorkflowIds.getType("parent-row-0")).toBe("iterator");
    });

    it("should return 'adk' for ADK child workflow IDs", () => {
      expect(ChildWorkflowIds.getType("adk-parent-node")).toBe("adk");
    });

    it("should return 'unknown' for unrecognized IDs", () => {
      expect(ChildWorkflowIds.getType("some-random-id")).toBe("unknown");
    });
  });

  describe("isChildWorkflow", () => {
    it("should recognize forEach child workflows", () => {
      expect(
        ChildWorkflowIds.isChildWorkflow(
          "parent-123-forEach-my_node-0",
        ),
      ).toBe(true);
    });

    it("should recognize iterator child workflows", () => {
      expect(
        ChildWorkflowIds.isChildWorkflow("parent-123-row-0"),
      ).toBe(true);
    });

    it("should recognize ADK child workflows", () => {
      expect(
        ChildWorkflowIds.isChildWorkflow("adk-parent-123-node"),
      ).toBe(true);
    });

    it("should return false for non-child workflow IDs", () => {
      expect(
        ChildWorkflowIds.isChildWorkflow("some-random-workflow"),
      ).toBe(false);
    });
  });

  // Verify existing iterator and ADK methods still work correctly
  describe("existing methods (backward compatibility)", () => {
    it("iterator() should still generate correct IDs", () => {
      const id = ChildWorkflowIds.iterator("parent-123", 5);
      expect(id).toBe("parent-123-row-5");
    });

    it("parseIterator() should still parse correctly", () => {
      const parsed = ChildWorkflowIds.parseIterator("parent-123-row-5");
      expect(parsed).toEqual({
        parentWorkflowId: "parent-123",
        index: 5,
      });
    });

    it("adk() should still generate correct IDs", () => {
      const id = ChildWorkflowIds.adk("parent-123", "my_node");
      expect(id).toBe("adk-parent-123-my_node");
    });

    it("parseAdk() should still parse correctly", () => {
      const parsed = ChildWorkflowIds.parseAdk("adk-parent-123-my_node");
      expect(parsed).toEqual({
        parentWorkflowId: "parent-123",
        nodeId: "my_node",
      });
    });

    it("isIteratorWorkflow() should not match forEach IDs", () => {
      expect(
        ChildWorkflowIds.isIteratorWorkflow(
          "parent-123-forEach-my_node-0",
        ),
      ).toBe(false);
    });
  });
});
