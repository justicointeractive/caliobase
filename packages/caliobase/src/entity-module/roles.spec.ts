import { Roles } from './roles';

describe('roles util', () => {
  it('should get proper roles from minimum', () => {
    expect(Roles.fromMiniumLevel('writer')).toEqual([
      'owner',
      'manager',
      'writer',
    ]);
  });
  it('should get proper roles from maximum', () => {
    expect(Roles.fromMaxLevel('writer')).toEqual([
      'writer',
      'moderator',
      'guest',
    ]);
  });
});
