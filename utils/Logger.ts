export class Logger {
  constructor(public name: string, public parent?: Logger) {}

  createChild(name: string) {
    return new Logger(name, this);
  }

  formatName(): string {
    return this.parent ? this.parent.formatName() + " " + this.name : this.name;
  }

  info(...args: any[]) {
    console.info(this.formatName(), ...args);
  }
}
