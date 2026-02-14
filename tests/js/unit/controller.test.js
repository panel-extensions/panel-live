import { describe, it, expect, vi, beforeEach } from 'vitest';

const { PanelLiveController } = await import('../../../lib/controller.js');

describe('PanelLiveController', () => {
  let mockElement;
  let controller;

  beforeEach(() => {
    mockElement = {
      run: vi.fn(),
      getCode: vi.fn(() => 'print("hello")'),
      setCode: vi.fn(),
      status: 'idle',
      remove: vi.fn(),
    };
    controller = new PanelLiveController(mockElement);
  });

  it('element getter returns the underlying element', () => {
    expect(controller.element).toBe(mockElement);
  });

  it('run() delegates to element.run()', () => {
    controller.run();
    expect(mockElement.run).toHaveBeenCalled();
  });

  it('getCode() delegates to element.getCode()', () => {
    const code = controller.getCode();
    expect(mockElement.getCode).toHaveBeenCalled();
    expect(code).toBe('print("hello")');
  });

  it('setCode() delegates to element.setCode()', () => {
    controller.setCode('x = 42');
    expect(mockElement.setCode).toHaveBeenCalledWith('x = 42');
  });

  it('status getter delegates to element.status', () => {
    expect(controller.status).toBe('idle');
  });

  it('destroy() removes element and nulls reference', () => {
    controller.destroy();
    expect(mockElement.remove).toHaveBeenCalled();
    expect(controller._element).toBeNull();
  });
});
