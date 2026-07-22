import { PrismaService } from './prisma.service';

describe('PrismaService lifecycle', () => {
  it('waits for Prisma to disconnect during module destruction', async () => {
    const service = new PrismaService();
    let resolveDisconnect: (() => void) | undefined;
    const disconnect = jest.spyOn(service, '$disconnect').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDisconnect = resolve;
        }),
    );

    let destroyCompleted = false;
    const destroy = service.onModuleDestroy().then(() => {
      destroyCompleted = true;
    });

    await Promise.resolve();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(destroyCompleted).toBe(false);

    expect(resolveDisconnect).toBeDefined();
    resolveDisconnect?.();
    await expect(destroy).resolves.toBeUndefined();
    expect(destroyCompleted).toBe(true);
  });
});
