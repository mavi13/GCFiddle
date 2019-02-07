// InputStack.qunit.js - ...
//
/* globals QUnit */

"use strict";

var InputStack;

if (typeof require !== "undefined") {
	InputStack = require("../InputStack.js"); // eslint-disable-line global-require
}

QUnit.module("InputStack", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		// var that = this; // eslint-disable-line no-invalid-this
	});

	QUnit.test("init", function (assert) {
		var oStack = new InputStack();

		assert.ok(oStack, "defined");
	});

	QUnit.test("initial stack", function (assert) {
		var oStack = new InputStack();

		assert.strictEqual(oStack.getInput(), undefined, "item on stack: undefined");
		assert.ok(!oStack.canUndo(), "cannot undo");
		assert.ok(!oStack.canUndoKeepOne(), "cannot undo keep one");
		assert.ok(!oStack.canRedo(), "cannot redo");
	});

	QUnit.test("stack with one item", function (assert) {
		var oStack = new InputStack();

		oStack.save("item1");
		assert.strictEqual(oStack.getInput(), "item1", "item on stack: item1");
		assert.ok(oStack.canUndo(), "can undo");
		assert.ok(!oStack.canUndoKeepOne(), "cannot undo keep one");
		assert.ok(!oStack.canRedo(), "cannot redo");
	});

	QUnit.test("stack with two items", function (assert) {
		var oStack = new InputStack();

		oStack.save("item1");
		assert.strictEqual(oStack.getInput(), "item1", "item on stack: item1");

		oStack.save("item2");
		assert.strictEqual(oStack.getInput(), "item2", "item on stack: item2");
		assert.ok(oStack.canUndo(), "can undo");
		assert.ok(oStack.canUndoKeepOne(), "can undo keep one");
		assert.ok(!oStack.canRedo(), "cannot redo");
	});

	QUnit.test("stack undo/redo", function (assert) {
		var oStack = new InputStack();

		oStack.save("item1");
		assert.strictEqual(oStack.getInput(), "item1", "item on stack: item1");

		assert.ok(oStack.canUndo(), "can undo");
		assert.strictEqual(oStack.undo(), undefined, "undo on stack: undefined");
		assert.ok(!oStack.canUndo(), "cannot undo");

		assert.ok(oStack.canRedo(), "can redo");
		assert.strictEqual(oStack.redo(), "item1", "redo on stack: item1");
		assert.ok(!oStack.canRedo(), "cannot redo");

		oStack.save("item2");
		assert.strictEqual(oStack.getInput(), "item2", "item on stack: item2");

		assert.ok(oStack.canUndo(), "can undo");
		assert.strictEqual(oStack.undo(), "item1", "undo on stack: item1");
		assert.ok(oStack.canRedo(), "can redo");

		oStack.save("item3");
		assert.strictEqual(oStack.getInput(), "item3", "item on stack: item3");

		assert.ok(!oStack.canRedo(), "cannot redo");
		assert.ok(oStack.canUndo(), "can undo");
		assert.strictEqual(oStack.undo(), "item1", "undo on stack: item1");

		assert.ok(oStack.canRedo(), "can redo");
		assert.strictEqual(oStack.redo(), "item3", "undo on stack: item3");

		assert.ok(oStack.init(), "init");
		assert.strictEqual(oStack.getInput(), undefined, "item on stack: undefined");
		assert.ok(!oStack.canUndo(), "cannot undo");
		assert.ok(!oStack.canUndoKeepOne(), "cannot undo keep one");
		assert.ok(!oStack.canRedo(), "cannot redo");
	});
});
// end
