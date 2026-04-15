import semver from 'semver'

export const isValidVersion = (version: string): boolean => Boolean(semver.valid(version))

export const isLower = (version: string, currentVersion: string): boolean =>
  semver.lt(version, currentVersion)

export const bumpVersion = (version: string): string => {
  const bumped = semver.inc(version, 'patch')
  if (!bumped) {
    throw new Error('Invalid semantic version')
  }
  return bumped
}
