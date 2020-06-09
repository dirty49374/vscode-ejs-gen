package main

import (
  "bytes"
  "errors"
  "fmt"
  "json"
)

//////////////////
// Animal:

type Animal int

const (
  Animal_Dog Animal = 0
  Animal_Cat Animal = 1
)

var Animal_names = map[int]string{
  0: "Dog",
  1: "Cat",
}

var Animal_values = map[string]int{
  "Dog": 0,
  "Cat": 1,
}

func (e Animal) String() string {
  return Animal_names[int(e)]
}

func (e Animal) Validate() error {
  if int(e) < 0 || 4 <= int(e) {
    return errors.New("unknown enum value")
  }
  return nil
}

func (e Animal) MarshalJSON() ([]byte, error) {
  buffer := bytes.NewBufferString(`"`)
  buffer.WriteString(Animal_names[int(e)])
  buffer.WriteString(`"`)
  return buffer.Bytes(), nil
}

func (e *Animal) UnmarshalJSON(b []byte) error {
  var j string
  err := json.Unmarshal(b, &j)
  if err != nil {
    return err
  }

  v, ok := Animal_values[j]
  if !ok {
    return fmt.Errorf("unknown enum value = %s", j)
  }

  *e = Animal(v)
  return nil
}


//////////////////
// Size:

type Size int

const (
  Size_Big Size = 0
  Size_Small Size = 1
)

var Size_names = map[int]string{
  0: "Big",
  1: "Small",
}

var Size_values = map[string]int{
  "Big": 0,
  "Small": 1,
}

func (e Size) String() string {
  return Size_names[int(e)]
}

func (e Size) Validate() error {
  if int(e) < 0 || 4 <= int(e) {
    return errors.New("unknown enum value")
  }
  return nil
}

func (e Size) MarshalJSON() ([]byte, error) {
  buffer := bytes.NewBufferString(`"`)
  buffer.WriteString(Size_names[int(e)])
  buffer.WriteString(`"`)
  return buffer.Bytes(), nil
}

func (e *Size) UnmarshalJSON(b []byte) error {
  var j string
  err := json.Unmarshal(b, &j)
  if err != nil {
    return err
  }

  v, ok := Size_values[j]
  if !ok {
    return fmt.Errorf("unknown enum value = %s", j)
  }

  *e = Size(v)
  return nil
}


