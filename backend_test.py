import requests
import sys
import json
from datetime import datetime
import uuid

class AuditXAPITester:
    def __init__(self, base_url="https://compliance-hub-196.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.client_token = None
        self.test_company_id = None
        self.test_auditoria_id = None
        self.test_config_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from review request
        self.test_email = "Nelsonsr.1983@gmail.com"
        self.test_password = "ELrey@28"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_client_login(self):
        """Test client login with provided credentials"""
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_email, "password": self.test_password}
        )
        if success and 'token' in response:
            self.client_token = response['token']
            print(f"   Client token obtained for {self.test_email}")
            return True
        return False

    def test_get_my_companies(self):
        """Test getting user's companies"""
        if not self.client_token:
            self.log_test("Get My Companies", False, "No client token")
            return False
            
        success, response = self.run_test(
            "Get My Companies",
            "GET",
            "my-companies",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.test_company_id = response[0]['id']
            print(f"   Found company: {response[0].get('company_name', 'N/A')} (ID: {self.test_company_id})")
            return True
        elif success and isinstance(response, list):
            self.log_test("Get My Companies", False, "No companies found for user")
            return False
        return success

    def test_create_audit_config(self):
        """Test creating audit configuration (needed for auditorias)"""
        if not self.client_token or not self.test_company_id:
            self.log_test("Create Audit Config", False, "Missing client token or company ID")
            return False
            
        config_data = {
            "company_id": self.test_company_id,
            "fecha_inicio": "2024-01-15",
            "fecha_fin": "2024-01-30",
            "alcance": "Evaluación completa del Sistema de Gestión SST",
            "tipo_auditoria": "SST",
            "areas_proceso": ["Administración", "Operaciones", "Mantenimiento"],
            "equipo_auditor": [
                {
                    "nombre": "Auditor Principal",
                    "identificacion": "12345678",
                    "rol": "auditor_lider",
                    "cargo": "Especialista SST",
                    "email": "auditor@empresa.com"
                }
            ],
            "equipo_auditado": [
                {
                    "nombre": "Responsable SST",
                    "identificacion": "87654321",
                    "rol": "coordinador_sst",
                    "cargo": "Coordinador SST",
                    "email": "sst@empresa.com"
                }
            ],
            "normas_generales_ids": [],
            "normas_especificas_ids": [],
            "objetivos": "Verificar cumplimiento de la Resolución 0312 de 2019",
            "criterios_adicionales": "Enfoque en prevención de riesgos laborales"
        }
        
        success, response = self.run_test(
            "Create Audit Configuration",
            "POST",
            "configuraciones-auditoria",
            200,
            data=config_data,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and 'id' in response:
            self.test_config_id = response['id']
            print(f"   Audit config created with ID: {self.test_config_id}")
        return success

    def test_activate_company(self):
        """Test activating a company"""
        if not self.superadmin_token or not self.test_company_id:
            self.log_test("Activate Company", False, "Missing superadmin token or company ID")
            return False
            
        success, response = self.run_test(
            "Activate Company",
            "POST",
            f"admin/activate-company/{self.test_company_id}",
            200,
            data={},
            headers={"Authorization": f"Bearer {self.superadmin_token}"}
        )
        return success

    def test_client_login(self):
        """Test client login after activation"""
        if not hasattr(self, 'test_client_email'):
            self.log_test("Client Login", False, "No test client email")
            return False
            
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_client_email, "password": self.test_client_password}
        )
        
        if success and 'token' in response:
            self.client_token = response['token']
            print(f"   Client token obtained")
            return True
        return False

    def test_get_standards(self):
        """Test getting standards"""
        if not self.client_token:
            self.log_test("Get Standards", False, "No client token")
            return False
            
        success, response = self.run_test(
            "Get Standards",
            "GET",
            "standards",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} standards")
            if len(response) == 60:
                print(f"   ✅ Correct number of standards (60)")
            else:
                print(f"   ⚠️  Expected 60 standards, found {len(response)}")
        return success

    def test_create_inspection(self):
        """Test creating an inspection"""
        if not self.client_token or not self.test_company_id:
            self.log_test("Create Inspection", False, "Missing client token or company ID")
            return False
            
        # Create sample responses for first 5 standards
        sample_responses = []
        for i in range(1, 6):
            standard_id = f"1.1.{i}"
            sample_responses.append({
                "standard_id": standard_id,
                "response": "cumple" if i % 2 == 0 else "cumple_parcial",
                "observations": f"Observación de prueba para estándar {standard_id}"
            })
        
        test_data = {
            "company_id": self.test_company_id,
            "responses": sample_responses
        }
        
        success, response = self.run_test(
            "Create Inspection",
            "POST",
            "inspections",
            200,
            data=test_data,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and 'inspection_id' in response:
            self.test_inspection_id = response['inspection_id']
            print(f"   Inspection created with ID: {self.test_inspection_id}")
            print(f"   Total score: {response.get('total_score', 'N/A')}%")
        return success

    def test_get_inspections(self):
        """Test getting inspections"""
        if not self.client_token:
            self.log_test("Get Inspections", False, "No client token")
            return False
            
        success, response = self.run_test(
            "Get Inspections",
            "GET",
            "inspections",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} inspections")
        return success

    def test_get_inspection_detail(self):
        """Test getting inspection detail"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("Get Inspection Detail", False, "Missing client token or inspection ID")
            return False
            
        success, response = self.run_test(
            "Get Inspection Detail",
            "GET",
            f"inspections/{self.test_inspection_id}",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success:
            print(f"   Inspection details retrieved successfully")
        return success

    def test_ai_analysis(self):
        """Test AI analysis generation"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("AI Analysis", False, "Missing client token or inspection ID")
            return False
            
        test_data = {"inspection_id": self.test_inspection_id}
        
        success, response = self.run_test(
            "AI Analysis Generation",
            "POST",
            "analyze-inspection",
            200,
            data=test_data,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and 'analysis_id' in response:
            self.test_analysis_id = response['analysis_id']
            print(f"   AI Analysis generated with ID: {self.test_analysis_id}")
            print(f"   Analysis length: {len(response.get('analysis', ''))} chars")
            print(f"   Report length: {len(response.get('report', ''))} chars")
        return success

    def test_get_analysis(self):
        """Test getting analysis"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("Get Analysis", False, "Missing client token or inspection ID")
            return False
            
        success, response = self.run_test(
            "Get Analysis",
            "GET",
            f"analysis/{self.test_inspection_id}",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        return success

    def test_update_analysis(self):
        """Test updating analysis report"""
        if not self.client_token or not self.test_analysis_id:
            self.log_test("Update Analysis", False, "Missing client token or analysis ID")
            return False
            
        updated_report = "Informe actualizado de prueba - " + datetime.now().isoformat()
        
        success, response = self.run_test(
            "Update Analysis Report",
            "PUT",
            f"analysis/{self.test_analysis_id}",
            200,
            data=updated_report,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        return success

    def test_generate_pdf(self):
        """Test PDF generation"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("Generate PDF", False, "Missing client token or inspection ID")
            return False
            
        # For PDF, we expect a different response type
        url = f"{self.api_url}/generate-pdf/{self.test_inspection_id}"
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        print(f"\n🔍 Testing Generate PDF...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'pdf' in content_type.lower():
                    self.log_test("Generate PDF", True)
                    print(f"   PDF generated successfully, size: {len(response.content)} bytes")
                    return True
                else:
                    self.log_test("Generate PDF", False, f"Wrong content type: {content_type}")
                    return False
            else:
                self.log_test("Generate PDF", False, f"Status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Generate PDF", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Security Inspection API Tests")
        print(f"Base URL: {self.base_url}")
        print("="*60)
        
        # Test sequence
        tests = [
            self.test_superadmin_login,
            self.test_client_registration,
            self.test_get_pending_companies,
            self.test_activate_company,
            self.test_client_login,
            self.test_get_standards,
            self.test_create_inspection,
            self.test_get_inspections,
            self.test_get_inspection_detail,
            self.test_ai_analysis,
            self.test_get_analysis,
            self.test_update_analysis,
            self.test_generate_pdf
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ {test.__name__} - EXCEPTION: {str(e)}")
                self.tests_run += 1
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SecurityInspectionAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())