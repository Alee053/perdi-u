import { useId, type ComponentPropsWithoutRef } from 'react'

type CityInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'list' | 'type'> & {
  suggestions: readonly string[]
}

export function CityInput({ suggestions, ...input }: CityInputProps) {
  const listId = useId()
  return (
    <>
      <input {...input} type="text" list={listId} />
      <datalist id={listId}>
        {suggestions.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
    </>
  )
}
