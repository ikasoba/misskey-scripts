import timers from "timers/promises";

export interface Task<T> {
  id: number;
  name: string;
  action: () => T;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (rason: unknown) => void;
}

export class TaskQueue {
  static maxTasks = parseInt(process.env["TaskQueue_maxTasks"] ?? "5");

  queue: Task<any>[] = [];
  delay = 500;

  private nextId = 0;
  private runningTasks = 0;

  push<T>(name: string, action: () => T): Promise<Awaited<T>> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        name,
        action,
        resolve,
        reject,
      });
    });
  }

  async start(): Promise<void> {
    if (this.runningTasks >= TaskQueue.maxTasks)
      return timers.setTimeout(5000).then(() => this.start());

    const task = this.queue.shift();

    if (task != null) {
      this.runTask(task);
    }

    if (this.runningTasks == 0 && this.queue.length == 0) {
      return;
    } else {
      return timers.setTimeout(this.delay).then(() => this.start());
    }
  }

  async runTask<T>(task: Task<T>): Promise<void> {
    console.info("\n💨 running task -", "id:", task.id, task.name);

    this.runningTasks++;

    try {
      const result = await task.action();
      task.resolve(result);

      console.info(
        "✅ task success -",
        "id:",
        task.id,
        task.name,
        "result:",
        "" + result,
        "\n"
      );
    } catch (err) {
      task.reject(err);

      console.info(
        "❗ task fail -",
        "id:",
        task.id,
        task.name,
        "err:",
        err,
        "\n"
      );
    }

    this.runningTasks--;
  }
}
