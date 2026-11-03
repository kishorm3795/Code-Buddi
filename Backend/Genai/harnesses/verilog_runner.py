"""
Icarus Verilog execution harness.
Ensures simulation files have proper top-level simulation setup.
"""

def prepare_verilog_payload(code: str) -> str:
    """
    Format Verilog source for Icarus Verilog simulation.
    If no $finish is found in code with initial blocks, inject a safety timeout.
    """
    trimmed = code.strip()
    
    # If code does not contain $finish or $stop, ensure it terminates within a reasonable time
    if "initial" in trimmed and "$finish" not in trimmed and "$stop" not in trimmed:
        watchdog = "\n\n// Code-Buddi Simulation Watchdog\ninitial begin\n    #10000;\n    $display(\"\\n[Simulation reached maximum ticks]\");\n    $finish;\nend\n"
        return trimmed + watchdog

    return trimmed
