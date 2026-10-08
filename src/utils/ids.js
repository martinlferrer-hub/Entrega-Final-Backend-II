const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

export const isValidObjectId = (value) =>
  typeof value === "string" && OBJECT_ID_REGEX.test(value);
