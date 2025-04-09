from django.core.exceptions import ImproperlyConfigured
from django.contrib import messages

# from confy import env, database
import decouple
import sys
import dj_database_url
import os
import json

# Project paths
# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = None
BASE_DIR_ENV = decouple.config('BASE_DIR',default=None)
if BASE_DIR_ENV is None:
   BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
else:
   BASE_DIR = BASE_DIR_ENV
PROJECT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bwf_core')
PRIVATE_MEDIA_ROOT = decouple.config("PRIVATE_MEDIA_ROOT", default="bwf_private_media")

