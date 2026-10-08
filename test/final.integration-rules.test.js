import test from "node:test";
import assert from "node:assert/strict";
import { isValidObjectId } from "../src/utils/ids.js";
import { sessionsService } from "../src/services/sessions.service.js";
import { usersRepository } from "../src/repositories/users.repository.js";

test("ObjectId válido de MongoDB", () => {
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("not-an-id"), false);
});

test("registro público fuerza role user aunque se envíe otro rol", async () => {
  const originalFind = usersRepository.findByEmail;
  const originalCreate = usersRepository.createUser;
  usersRepository.findByEmail = async () => null;
  usersRepository.createUser = async (data) => ({
    _id: "507f1f77bcf86cd799439011",
    ...data
  });

  try {
    const result = await sessionsService.register({
      first_name: "Ana",
      last_name: "Pérez",
      email: "ana-final@example.com",
      password: "12345678",
      role: "admin"
    });

    assert.equal(result.role, "user");
    assert.equal("password" in result, false);
  } finally {
    usersRepository.findByEmail = originalFind;
    usersRepository.createUser = originalCreate;
  }
});
