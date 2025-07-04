#!/bin/bash

# save current pwd
original_dir=$(pwd)

# get dirname of current bash file
script_dir=$(dirname "$(readlink -f "$0")")

# change pwd
cd "$script_dir" || {
  echo "Error: can't change dir to $script_dir"
  exit 1
}

source ../libs/get_package_name.sh

# Функция для завершения
cleanup_after_all_done() {
  # Возвращаемся в исходную директорию
  cd "$original_dir" || {
    echo "Error: can't change dir to $original_dir"
    exit 1
  }
  exit 0
}

# Перехватываем сигналы завершения
trap cleanup_after_all_done EXIT TERM INT

if [ ! -f "../../backend/prisma/migrations" ]; then
  cd ../../backend

  print_package_name "Init prisma in:"

  npm run prisma_init
fi
