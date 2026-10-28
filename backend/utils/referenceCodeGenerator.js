import { randomBytes } from "node:crypto";

class ReferenceCodeGenerator {
  generate() {
    return `REF-${randomBytes(6)
      .toString("hex")
      .toUpperCase()}`;
  }
}

export default ReferenceCodeGenerator;